// Motor de captura y validación de Intención Humana (PoHI Core)
export interface KeystrokeData {
  dwellTimes: number[];
  flightTimes: number[];
}

export class PoHIEngine {
  private keyTimestamps: Map<string, number> = new Map();
  private dwellTimes: number[] = [];
  private flightTimes: number[] = [];
  private lastKeyUpTime: number = 0;

  public handleKeyDown(key: string) {
    const now = performance.now();
    this.keyTimestamps.set(key, now);

    if (this.lastKeyUpTime > 0) {
      const flightTime = now - this.lastKeyUpTime;
      // Filtramos outliers lógicos por pausas largas
      if (flightTime < 2000) {
        this.flightTimes.push(flightTime);
      }
    }
  }

  public handleKeyUp(key: string) {
    const now = performance.now();
    const keyDownTime = this.keyTimestamps.get(key);

    if (keyDownTime) {
      const dwellTime = now - keyDownTime;
      this.dwellTimes.push(dwellTime);
      this.keyTimestamps.delete(key);
    }
    this.lastKeyUpTime = now;
  }

  // Cálculo estadístico de varianza y asimetría (Simulación Fisher-Pearson simplificada)
  public evaluateIntent(): { isHuman: boolean; confidence: number; stats: any } {
    if (this.dwellTimes.length < 5 || this.flightTimes.length < 5) {
      return { isHuman: false, confidence: 0, stats: { message: "Datos insuficientes. Sigue tecleando." } };
    }

    const meanDwell = this.dwellTimes.reduce((a, b) => a + b, 0) / this.dwellTimes.length;
    const varianceDwell = this.dwellTimes.reduce((sum, val) => sum + Math.pow(val - meanDwell, 2), 0) / this.dwellTimes.length;
    
    const meanFlight = this.flightTimes.reduce((a, b) => a + b, 0) / this.flightTimes.length;
    const varianceFlight = this.flightTimes.reduce((sum, val) => sum + Math.pow(val - meanFlight, 2), 0) / this.flightTimes.length;

    // Los bots inyectan texto con varianza casi nula (ritmo perfecto de máquina)
    // Los humanos muestran fluctuaciones neuromusculares orgánicas (varianza alta)
    const isHumanByVariance = varianceDwell > 15 && varianceFlight > 500;
    
    // Simulación de puntaje de confianza basado en la entropía del movimiento
    const entropyScore = Math.min(100, Math.floor((varianceDwell + varianceFlight) / 20));

    return {
      isHuman: isHumanByVariance,
      confidence: isHumanByVariance ? Math.max(85, entropyScore) : 15,
      stats: {
        meanDwell: meanDwell.toFixed(2),
        varianceDwell: varianceDwell.toFixed(2),
        meanFlight: meanFlight.toFixed(2),
        varianceFlight: varianceFlight.toFixed(2)
      }
    };
  }

  public reset() {
    this.keyTimestamps.clear();
    this.dwellTimes = [];
    this.flightTimes = [];
    this.lastKeyUpTime = 0;
  }
}
