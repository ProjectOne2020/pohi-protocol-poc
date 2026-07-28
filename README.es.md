# Proof of Human Intent (PoHI)

> Un protocolo con preservación de privacidad para verificar la intención humana en transacciones digitales mediadas por inteligencia artificial.

## Descripción

Proof of Human Intent (PoHI) es un protocolo de investigación diseñado para verificar que una acción digital fue iniciada mediante una interacción humana real y no por un agente autónomo de software.

A diferencia de los sistemas tradicionales de verificación de identidad, PoHI **no intenta responder quién es el usuario**.

Su objetivo es demostrar que **existió una intención humana antes de que ocurriera la acción digital**, preservando completamente la privacidad mediante Pruebas de Conocimiento Cero (zk-SNARKs).

---

## Motivación

Los modelos modernos de inteligencia artificial están alcanzando niveles de generación de contenido prácticamente indistinguibles del lenguaje humano.

En este escenario, analizar únicamente el contenido generado deja de ser suficiente para diferenciar entre una interacción humana y una automatizada.

PoHI propone un cambio de paradigma.

En lugar de analizar el contenido generado, analiza la dinámica física utilizada para producirlo.

---

## Idea Principal

PoHI mide diferentes características conductuales durante la interacción del usuario, entre ellas:

- Tiempo de presión de teclas (Dwell Time)
- Tiempo entre pulsaciones (Flight Time)
- Pausas cognitivas
- Asimetría motora
- Dinámica de correcciones
- Entropía de interacción humana

Todas las métricas se procesan localmente en el dispositivo.

La información biométrica nunca abandona el equipo del usuario.

Únicamente se genera una prueba criptográfica de conocimiento cero (zk-SNARK) que demuestra que la interacción cumple los requisitos del protocolo sin revelar información biométrica.

---

## Estructura del Repositorio

```text
paper/          Investigación académica
docs/           Documentación técnica
prototype/      Prueba de concepto
client/         Cliente web
server/         Servicios de verificación
circuits/       Circuitos zk-SNARK
verifier/       Verificador criptográfico
research/       Investigación experimental
benchmarks/     Conjuntos de validación
```

---

## Estado del Proyecto

Estado actual:

- ✅ Investigación finalizada
- ✅ Manuscrito académico finalizado
- 🚧 Implementación del prototipo
- 🚧 Implementación de referencia
- ⏳ Validación experimental

---

## Áreas de Investigación

- Seguridad Informática
- Criptografía Aplicada
- Biometría Conductual
- Pruebas de Conocimiento Cero
- Interacción Humano-Computadora
- Seguridad para IA
- Prevención de Fraude
- Sistemas Distribuidos

---

## Visión

Proof of Human Intent introduce una nueva primitiva de seguridad.

En lugar de demostrar la identidad de una persona, PoHI busca demostrar que una acción digital fue originada por una intención humana genuina preservando completamente la privacidad.

El protocolo está diseñado para complementar, no reemplazar, los sistemas tradicionales de autenticación y verificación de identidad.

---

## Repositorio

GitHub Repository

https://github.com/ProjectOne2020/pohi-protocol-pocmi

---

## Negocios y Colaboración

El proyecto PoHI está abierto a:

- Licenciamiento comercial
- Alianzas estratégicas
- Colaboraciones de investigación
- Integraciones empresariales
- Consultoría en ciberseguridad
- Oportunidades de inversión
- Implementaciones piloto
- Colaboraciones académicas

Si tu organización está interesada en adoptar, licenciar o colaborar en el desarrollo de PoHI, no dudes en contactarme.

---

## Contacto

**Alejandro Gutiérrez**

Correo electrónico

alejandro.gutierrezb31@gmail.com

GitHub

https://github.com/ProjectOne2020/pohi-protocol-pocmi

LinkedIn

https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/

---

## Licencia

La licencia será definida antes de la primera versión estable del protocolo.

---

## Aviso

Proof of Human Intent (PoHI) es un proyecto activo de investigación.

El protocolo y su implementación de referencia continúan en desarrollo y no deben considerarse listos para producción hasta completar una validación experimental exhaustiva.

---

© 2026 Alejandro Gutiérrez. Todos los derechos reservados.
