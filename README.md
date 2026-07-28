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
4. [¿Por qué PoHI es disruptivo y superior? (El Foso Defensivo)](#-por-qué-pohi-es-disruptivo-y-superior-el-foso-defensivo)
5. [Casos de Uso Prácticos](#-casos-de-uso-prácticos)
6. [Estructura del Código](#-estructura-del-código)
7. [Ejecución Local](#-ejecución-local)

---

## 🚀 Resumen del Proyecto

**PoHI (Proof of Human Intent)** es una Prueba de Concepto (PoC) que investiga un primitivo criptográfico para verificar la intención humana a través de la **dinámica de tecleo (*Keystroke Dynamics*)**, procesada íntegramente en el navegador del usuario y lista para ser empaquetada en Pruebas de Conocimiento Cero (zk-SNARKs).

---

## ⚠️ El Problema: La Automatización del Fraude

Las economías P2P, los mercados descentralizados y los formularios críticos de internet sufren una degradación masiva de confianza debido a:
- **Graneos de Bots impulsados por IA:** Scripts automatizados que replican comportamientos sintéticos a escala masiva con un costo operativo cercano a cero.
- **Ataques Sybil y Scalping:** Creación masiva de identidades falsas para drenar contratos inteligentes, acaparar recursos o manipular gobernanzas.
- **Vulnerabilidad de la Privacidad:** Las soluciones tradicionales de biometría exigen enviar telemetría a servidores centralizados, convirtiéndose en blancos atractivos para brechas de datos.

---

## 💡 La Solución PoHI (Privacy-First)

El motor (`pohiEngine.ts`) calcula en tiempo real los tiempos de vuelo (*flight times*) y de pulsación (*dwell times*) de las teclas. Aplicando análisis estadístico sobre la varianza y la distribución neuromuscular:
1. **Detección de Scripts:** Los bots inyectan texto con una varianza de latencia casi nula (ritmo milimétricamente lineal).
2. **Entropía Humana:** Los humanos reales generan micro-variaciones caóticas debido a la fatiga y latencia neuromuscular.
3. **Cero Fugas:** Ningún dato biométrico crudo sale del dispositivo del usuario; la validación ocurre localmente.

---

## 🧠 ¿Por qué PoHI es disruptivo y superior? (El Foso Defensivo)

A diferencia de las herramientas del pasado, PoHI introduce un paradigma completamente nuevo que resuelve las fallas históricas de la biometría conductual:

* **1. Arquitectura 100% Client-Side con Privacidad Criptográfica (zk-Ready):** 
  Las soluciones anteriores (como *TypingDNA* o sistemas bancarios) obligan a enviar datos de tecleo a servidores centrales, violando la privacidad e introduciendo un punto único de fallo (honeypot). PoHI procesa todo localmente y empaqueta el resultado en una prueba matemática (`zk-SNARK`). El servidor o contrato inteligente solo recibe un `TRUE` o `FALSE`, sin conocer jamás los datos biométricos del usuario.
* **2. Eliminación de Hardware Invasivo:** 
  Proyectos Web3 de prueba de humanidad (como *Worldcoin*) exigen escáneres de iris u otros hardwares invasivos que la gente rechaza. PoHI utiliza el teclado que el usuario ya tiene en su laptop o teléfono, sin fricción adicional.
* **3. Destrucción del Modelo Económico del Atacante:** 
  Incluso si un bot intenta simular errores humanos o pausas mediante scripts avanzados, el costo computacional y de desarrollo para replicar la varianza neuromuscular caótica destruye la rentabilidad del fraude a escala. **Hacemos que estafar cueste más que la ganancia obtenida.**

---

## 🎯 Casos de Uso Prácticos

El primitivo criptográfico de PoHI puede integrarse en múltiples industrias donde los bots destruyen las economías digitales:

1. **Protección de Transacciones P2P (Escrow):** 
   Asegurar contratos inteligentes en marketplaces (como Facebook Marketplace o ecosistemas descentralizados) requiriendo una firma biométrica de intención humana antes de retener o liberar fondos, bloqueando granjas de bots.
2. **Resistencia Sybil en DAOs y Airdrops:** 
   Evitar que un solo atacante cree 10,000 wallets automáticas para drenar tokens gratuitos o manipular votaciones de gobernanza (*One person, one vote/token*).
3. **Ecosistemas Gamer y Prevención de Bot-Farming:** 
   Erradicar los bots que juegan 24/7 en MMORPGs para farmear recursos, evaluando la entropía del teclado sin interrumpir la experiencia con CAPTCHAs visuales molestos.
4. **Neutralización de Scalpers (Acaparadores de Boletos):** 
   Impedir que scripts compren el 100% de las entradas para conciertos o eventos masivos en milisegundos, obligando a una validación de tecleo orgánico en el *checkout*.
5. **Certificación de Contenido Orgánico (Anti-Spam / Anti-AI):** 
   Validar en foros o sistemas de reseñas si un texto fue realmente redactado por una mente humana (con sus pausas y correcciones naturales) o inyectado de forma sintética mediante *Copy/Paste* o IA.

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
