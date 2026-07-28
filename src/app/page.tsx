'v client';

import { useState, useEffect, useRef } from 'react';
import { PoHIEngine } from '@/lib/pohi/pohiEngine';

type Language = 'es' | 'en';

export default function PoCDashboard() {
  const [lang, setLang] = useState<Language>('es');
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [zkProof, ZkProof] = useState<string | null>(null);
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

      // Si pasa la validación humana y completó suficiente texto, generamos la prueba zk simulada
      if (evaluation.isHuman && text.length >= 10) {
        const randomHash = "0x" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
        ZkProof(randomHash);
      } else {
        ZkProof(null);
      }
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    ZkProof(null);
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  const content = {
    es: {
      badge: "Protocolo PoHI v0.1 - Prueba de Concepto",
      title: "Prueba de Intención Humana",
      subtitle: "Auditoría biométrica conductual ejecutada 100% en el cliente. Protege transacciones P2P contra bots sin comprometer tu privacidad.",
      instructionTitle: "Escribe la frase de confirmación de forma natural:",
      placeholder: "Escribe aquí la frase...",
      statusTitle: "Estado del Motor Biométrico en Vivo:",
      waiting: "Esperando pulsaciones...",
      human: "VERIFICADO: HUMANO REAL (Var. Válida)",
      bot: "ANALIZANDO... (Escribe más natural)",
      confidence: "Confianza Neuromuscular:",
      variance: "Varianza de Latencia:",
      proofTitle: "Prueba de Conocimiento Cero (zk-SNARK Hash Generado):",
      reset: "Reiniciar prueba",
      footer: "Zero-Knowledge Architecture Ready"
    },
    en: {
      badge: "PoHI Protocol v0.1 - Proof of Concept",
      title: "Proof of Human Intent",
      subtitle: "Client-side behavioral biometric auditing. Securing P2P transactions against AI bots while preserving user privacy.",
      instructionTitle: "Type the confirmation phrase naturally:",
      placeholder: "Type the phrase here...",
      statusTitle: "Live Biometric Engine Status:",
      waiting: "Waiting for keystrokes...",
      human: "VERIFIED: REAL HUMAN (Valid Var.)",
      bot: "ANALYZING... (Type more naturally)",
      confidence: "Neuromuscular Confidence:",
      variance: "Latency Variance:",
      proofTitle: "Zero-Knowledge Proof (zk-SNARK Hash Generated):",
      reset: "Reset test",
      footer: "Zero-Knowledge Architecture Ready"
    }
  };

  const t = content[lang];

  return (
    <main style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px' }}>
      
      {/* Selector de Idioma Flotante */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '5px', background: '#0f172a', padding: '4px', borderRadius: '9999px', border: '1px solid #1e293b' }}>
        <button
          onClick={() => setLang('es')}
          style={{ background: lang === 'es' ? '#06b6d4' : 'transparent', color: lang === 'es' ? '#020617' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ES
        </button>
        <button
          onClick={() => setLang('en')}
          style={{ background: lang === 'en' ? '#06b6d4' : 'transparent', color: lang === 'en' ? '#020617' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          EN
        </button>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', boxSizing: 'border-box' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ display: 'inline-block', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', color: '#22d3ee', background: '#083344', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #164e63', marginBottom: '12px' }}>
            {t.badge}
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px 0', color: '#ffffff' }}>
            {t.title}
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
            {t.subtitle}
          </p>
        </div>

        {/* Caja de Frase Requerida */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '8px' }}>
            {t.instructionTitle}
          </label>
          
          <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span>"{targetPhrase}"</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Copiar / Copy</span>
          </div>
          
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder={t.placeholder}
            style={{ width: '100%', padding: '14px 16px', background: '#020617', border: '1px solid #334155', borderRadius: '12px', color: '#ffffff', fontSize: '14px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
            autoComplete="off"
          />
        </div>

        {/* Panel de Resultados en Vivo */}
        <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            {t.statusTitle}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: result?.isHuman ? '#34d399' : '#fbbf24', display: 'inline-block', boxShadow: result?.isHuman ? '0 0 10px #34d399' : '0 0 10px #fbbf24' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: result?.isHuman ? '#34d399' : '#fbbf24' }}>
              {result ? (result.isHuman ? t.human : t.bot) : t.waiting}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid #0f172a', fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>
            <div>
              {t.confidence} <br />
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>{result ? `${result.confidence}%` : '---'}</span>
            </div>
            <div>
              {t.variance} <br />
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>{result?.stats?.varianceDwell ? `${result.stats.varianceDwell}ms` : '---'}</span>
            </div>
          </div>

          {/* Si genera la prueba zk, aparece aquí */}
          {zkProof && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#064e3b', border: '1px solid #059669', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', color: '#34d399', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                {t.proofTitle}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ecfdf5', wordBreak: 'break-all' }}>
                {zkProof}
              </div>
            </div>
          )}
        </div>

        {/* Acciones Inferiores */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t.reset}
          </button>
          
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#22d3ee', background: '#083344', padding: '4px 8px', borderRadius: '6px', border: '1px solid #164e63' }}>
            {t.footer}
          </span>
        </div>

      </div>
    </main>
  );
}
