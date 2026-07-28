// Motor biométrico y de detección de intención humana (PoHI Core v0.2)
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
      if (flightTime < 3000 && flightTime > 0) {
        this.flightTimes.push(flightTime);
      }
    }
  }

  public handleKeyUp(key: string) {
    const now = performance.now();
    const keyDownTime = this.keyTimestamps.get(key);

    if (keyDownTime) {
      const dwellTime = now - keyDownTime;
      if (dwellTime > 0 && dwellTime < 1000) {
        this.dwellTimes.push(dwellTime);
      }
      this.keyTimestamps.delete(key);
    }
    this.lastKeyUpTime = now;
  }

  public evaluateIntent(currentTextLength: number): { isHuman: boolean; confidence: number; stats: any; status: string } {
    // Si el usuario intentó hacer Copy-Paste, se invalida inmediatamente
    if (this.pasteDetected) {
      return {
        isHuman: false,
        confidence: 0,
        stats: { varianceDwell: 0, varianceFlight: 0 },
        status: "paste"
      };
    }

    if (currentTextLength < 4) {
      return {
        isHuman: false,
        confidence: 10,
        stats: { varianceDwell: 0, varianceFlight: 0 },
        status: "waiting"
      };
    }

    // Cálculo estadístico de varianza de pulsación (Dwell time)
    const meanDwell = this.dwellTimes.length > 0 
      ? this.dwellTimes.reduce((a, b) => a + b, 0) / this.dwellTimes.length 
      : 0;
    
    const varianceDwell = this.dwellTimes.length > 1 
      ? this.dwellTimes.reduce((sum, val) => sum + Math.pow(val - meanDwell, 2), 0) / this.dwellTimes.length 
      : 5;

    // Los scripts automatizados o bots escriben con varianza casi nula (ritmo robótico idéntico)
    // Los humanos reales muestran varianza orgánica por la latencia neuromuscular
    const isRobot = varianceDwell < 0.1 && this.dwellTimes.length > 4;
    const isHuman = !isRobot && currentTextLength >= 5;

    const confidence = isHuman ? Math.min(99, Math.floor(82 + (varianceDwell * 3))) : 15;

    return {
      isHuman: isHuman,
      confidence: isHuman ? confidence : 20,
      stats: {
        varianceDwell: varianceDwell.toFixed(2),
        varianceFlight: this.flightTimes.length > 0 ? (this.flightTimes.reduce((a, b) => a + b, 0) / this.flightTimes.length).toFixed(2) : "0"
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
