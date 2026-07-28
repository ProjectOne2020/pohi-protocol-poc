'use client';

import { useState, useEffect, useRef } from 'react';
import { PoHIEngine } from '@/lib/pohi/pohiEngine';

type Language = 'es' | 'en';

export default function PoCDashboard() {
  const [lang, setLang] = useState<Language>('es');
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const engineRef = useRef<PoHIEngine | null>(null);

  const targetPhrase = "Confirmo transaccion segura";

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

  const content = {
    es: {
      badge: "Protocolo PoHI v0.1 - Prueba de Concepto",
      title: "Prueba de Intención Humana",
      subtitle: "Auditoría biométrica conductual ejecutada 100% en el cliente. Protege transacciones P2P contra bots sin comprometer tu privacidad.",
      instructionTitle: "Paso 1: Escribe la frase de confirmación de forma natural:",
      targetBox: "Frase requerida:",
      placeholder: "Escribe aquí...",
      statusTitle: "Resultado del Análisis Biométrico en Tiempo Real:",
      waiting: "Esperando pulsaciones...",
      human: "VERIFICADO: PATRÓN HUMANO DETECTADO",
      bot: "ANALIZANDO RITMO / PATRÓN ARTIFICIAL",
      confidence: "Confianza Neuromuscular:",
      variance: "Varianza de Latencia:",
      explanation: "Los humanos reales generan micro-pausas y variaciones caóticas al teclear. Los bots y scripts inyectan texto con velocidad y ritmo milimétricamente lineales.",
      reset: "Reiniciar prueba",
      footer: "Zero-Knowledge Architecture Ready"
    },
    en: {
      badge: "PoHI Protocol v0.1 - Proof of Concept",
      title: "Proof of Human Intent",
      subtitle: "Client-side behavioral biometric auditing. Securing P2P transactions against AI bots while preserving user privacy.",
      instructionTitle: "Step 1: Type the confirmation phrase naturally:",
      targetBox: "Required phrase:",
      placeholder: "Type here...",
      statusTitle: "Real-time Biometric Analysis Result:",
      waiting: "Waiting for keystrokes...",
      human: "VERIFIED: HUMAN PATTERN DETECTED",
      bot: "ANALYZING RITMO / ARTIFICIAL PATTERN",
      confidence: "Neuromuscular Confidence:",
      variance: "Latency Variance:",
      explanation: "Real humans produce chaotic micro-variations and pauses while typing. Bots and scripts inject text with perfectly linear speed and timing.",
      reset: "Reset test",
      footer: "Zero-Knowledge Architecture Ready"
    }
  };

  const t = content[lang];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Selector de Idioma */}
      <div className="absolute top-6 right-6 flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full p-1 shadow-lg">
        <button
          onClick={() => setLang('es')}
          className={`px-3 py-1 text-xs font-mono rounded-full transition-all ${
            lang === 'es' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ES
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1 text-xs font-mono rounded-full transition-all ${
            lang === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EN
        </button>
      </div>

      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Línea decorativa superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        <div className="text-center mb-8">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50 mb-4">
            {t.badge}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {t.title}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Sección de Entrada */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t.instructionTitle}
          </label>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-400 flex items-center justify-between">
            <span>"{targetPhrase}"</span>
            <span className="text-[10px] text-slate-500 uppercase">Copiar o memorizar</span>
          </div>
          
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder={t.placeholder}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-100 font-mono text-sm shadow-inner transition-all"
            autoComplete="off"
          />
        </div>

        {/* Caja de Resultados */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t.statusTitle}</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`inline-block w-3 h-3 rounded-full animate-pulse ${
              result?.isHuman ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
            }`} />
            <span className={`text-xs font-bold font-mono tracking-wide ${
              result?.isHuman ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {result ? (result.isHuman ? t.human : t.bot) : t.waiting}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 text-xs font-mono text-slate-400 border-t border-slate-900">
            <div>
              {t.confidence} <br />
              <span className="text-slate-100 font-bold text-sm">{result ? `${result.confidence}%` : '---'}</span>
            </div>
            <div>
              {t.variance} <br />
              <span className="text-slate-100 font-bold text-sm">{result?.stats?.varianceDwell ? `${result.stats.varianceDwell}ms` : '---'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-900/50">
            {t.explanation}
          </p>
        </div>

        {/* Controles inferiores */}
        <div className="mt-6 flex justify-between items-center text-xs">
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition-colors underline underline-offset-4 font-mono"
          >
            {t.reset}
          </button>
          
          <span className="text-[10px] text-cyan-500/70 font-mono bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-900/40">
            {t.footer}
          </span>
        </div>

      </div>
    </main>
  );
}
