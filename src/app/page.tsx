'use client';

import { useState, useEffect, useRef } from 'react';
import { PoHIEngine } from '@/lib/pohi/pohiEngine';

export default function PoCDashboard() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const engineRef = useRef<PoHIEngine | null>(null);

  useEffect(() => {
    engineRef.current = new PoHIEngine();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (engineRef.current) {
      engineRef.current.handleKeyDown(e.key);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (engineRef.current) {
      engineRef.current.handleKeyUp(e.key);
      const evaluation = engineRef.current.evaluateIntent();
      setResult(evaluation);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded-full border border-cyan-800/50">
            PoHI Protocol v0.1 - PoC
          </span>
          <h1 className="text-2xl font-bold mt-4">Proof of Human Intent</h1>
          <p className="text-sm text-slate-400 mt-2">
            Demostración en vivo de auditoría biométrica conductual basada en cliente (Client-Side). Sin servidores centrales, sin invadir tu privacidad.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
            Escribe la frase de confirmación: <span className="text-cyan-400">"Confirmo transaccion segura"</span>
          </label>
          
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Escribe aquí de forma natural..."
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-100 font-mono transition-all"
            autoComplete="off"
          />
        </div>

        {result && (
          <div className="mt-6 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Estado de Validación:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                result.isHuman ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {result.isHuman ? '🟢 VERIFICADO: HUMANO' : '🟡 ANALIZANDO PATRÓN...'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-mono text-slate-400 border-t border-slate-900">
              <div>Confianza Neuromuscular: <span className="text-slate-100 font-bold">{result.confidence}%</span></div>
              <div>Varianza Dwell: <span className="text-slate-100">{result.stats.varianceDwell || 0}ms</span></div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Reiniciar captura
          </button>
          
          <span className="text-[10px] text-slate-600 font-mono">
            Zero-Knowledge Ready
          </span>
        </div>

      </div>
    </main>
  );
}
