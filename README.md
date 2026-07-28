<div align="center">
  
  # 🛡️ PoHI Protocol (Proof of Human Intent) — PoC
  
  **Auditoría biométrica conductual basada en el cliente para la mitigación de ataques Sybil y fraude automatizado en redes P2P.**

  [![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Privacy](https://img.shields.io/badge/Privacy-Client_Side_Only-emerald)](#)

  <br />

  🌐 *Read this in [English](README-en.md)*

</div>

---

## 📑 Índice
1. [Resumen del Proyecto](#-resumen-del-proyecto)
2. [El Problema: La Automatización del Fraude](#-el-problema-la-automatización-del-fraude)
3. [La Solución PoHI (Privacy-First)](#-la-solución-pohi-privacy-first)
4. [Estructura del Código](#-estructura-del-código)
5. [Ejecución Local](#-ejecución-local)

---

## 🚀 Resumen del Proyecto

**PoHI (Proof of Human Intent)** es una Prueba de Concepto (PoC) que investiga un primitivo criptográfico para verificar la intención humana a través de la **dinámica de tecleo (*Keystroke Dynamics*)**, procesada íntegramente en el navegador del usuario y lista para ser empaquetada en Pruebas de Conocimiento Cero (zk-SNARKs).

Este repositorio demuestra que es posible auditar la entropía neuromuscular humana sin enviar datos biométricos sensibles a servidores centrales.

---

## ⚠️ El Problema: La Automatización del Fraude

Las economías P2P, los mercados descentralizados y los formularios críticos de internet sufren una degradación masiva de confianza debido a:
- **Graneos de Bots impulsados por IA:** Scripts automatizados que replican comportamientos sintéticos a escala masiva.
- **Ataques Sybil y Scalping:** Creación masiva de identidades falsas para drenar contratos inteligentes o acaparar recursos.
- **Vulneración de la Privacidad:** Las soluciones tradicionales de biometría exigen enviar telemetría a servidores centralizados, convirtiéndose en un blanco atractivo para brechas de datos.

---

## 💡 La Solución PoHI (Privacy-First)

El motor (`pohiEngine.ts`) calcula en tiempo real los tiempos de vuelo (*flight times*) y de pulsación (*dwell times*) de las teclas. 

Aplicando análisis estadístico sobre la varianza y la distribución del ritmo de escritura:
1. **Detección de Scripts:** Los bots inyectan texto con una varianza de latencia casi nula (ritmo milimétricamente lineal).
2. **Entropía Humana:** Los humanos reales generan micro-variaciones caóticas debido a la fatiga neuromuscular.
3. **Cero Fugas:** Ningún dato biométrico crudo sale del dispositivo del usuario; el sistema valida la intención localmente.

---

## 📂 Estructura del Código

```text
pohi-protocol-poc/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx       # Interfaz de demostración interactiva
│   └── lib/
│       └── pohi/
│           └── pohiEngine.ts # Motor biométrico y matemático
