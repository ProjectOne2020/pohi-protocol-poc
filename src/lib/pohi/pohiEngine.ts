// Motor biométrico y de detección de intención humana (PoHI Core v0.3)
export class PoHIEngine {
  private keyTimestamps: Map<string, number> = new Map();
  private dwellTimes: number[] = [];
  private flightTimes: number[] = [];
  private lastKeyUpTime: number = 0;
  public pasteDetected: boolean = false;

  public handlePaste() {
    this.pasteDetected = true;
  }

  public handleKeyDown(key: string) {
    const now = performance.now();
    this.keyTimestamps.set(key, now);

    if (this.lastKeyUpTime > 0) {
      const flightTime = now - this.lastKeyUpTime;
      // Filtramos pausas absurdas de más de 2 segundos (cuando el humano se detiene a pensar)
      if (flightTime < 2000 && flightTime > 0) {
        this.flightTimes.push(flightTime);
      }
    }
  }

  public handleKeyUp(key: string) {
    const now = performance.now();
    const keyDownTime = this.keyTimestamps.get(key);

    if (keyDownTime) {
      const dwellTime = now - keyDownTime;
      if (dwellTime > 0 && dwellTime < 500) {
        this.dwellTimes.push(dwellTime);
      }
      this.keyTimestamps.delete(key);
    }
    this.lastKeyUpTime = now;
  }

  public evaluateIntent(currentTextLength: number): { isHuman: boolean; confidence: number; stats: any; status: string } {
    if (this.pasteDetected) {
      return {
        isHuman: false,
        confidence: 0,
        stats: { varianceDwell: 0, varianceFlight: 0 },
        status: "paste"
      };
    }

    // Exigimos al menos 15 caracteres para tener una muestra estadística confiable
    if (currentTextLength < 15) {
      return {
        isHuman: false,
        confidence: Math.floor((currentTextLength / 15) * 40),
        stats: { varianceDwell: 0, varianceFlight: 0 },
        status: "collecting" // Recopilando entropía
      };
    }

    const meanDwell = this.dwellTimes.length > 0 
      ? this.dwellTimes.reduce((a, b) => a + b, 0) / this.dwellTimes.length 
      : 0;
    
    const varianceDwell = this.dwellTimes.length > 1 
      ? this.dwellTimes.reduce((sum, val) => sum + Math.pow(val - meanDwell, 2), 0) / this.dwellTimes.length 
      : 0;

    const meanFlight = this.flightTimes.length > 0 
      ? this.flightTimes.reduce((a, b) => a + b, 0) / this.flightTimes.length 
      : 0;

    const varianceFlight = this.flightTimes.length > 1 
      ? this.flightTimes.reduce((sum, val) => sum + Math.pow(val - meanFlight, 2), 0) / this.flightTimes.length 
      : 0;

    // Detección de bot por linealidad extrema (scripts que escriben letra por letra con ritmos planos)
    const isTooLinear = varianceDwell < 0.05 && varianceFlight < 10;

    const isHuman = !isTooLinear && this.dwellTimes.length >= 10;
    
    // Cálculo de confianza basado en la entropía orgánica de los tiempos de vuelo
    const entropyScore = Math.min(98, Math.floor(70 + (varianceFlight / 50)));

    return {
      isHuman: isHuman,
      confidence: isHuman ? Math.max(85, entropyScore) : 30,
      stats: {
        varianceDwell: varianceDwell.toFixed(2),
        varianceFlight: varianceFlight.toFixed(2)
      },
      status: isHuman ? "human" : "analyzing"
    };
  }

  public reset() {
    this.keyTimestamps.clear();
    this.dwellTimes = [];
    this.flightTimes = [];
    this.lastKeyUpTime = 0;
    this.pasteDetected = false;
  }
}
