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

En lugar de analizar el resultado de la interacción, analiza la dinámica física utilizada para producirla.

---

## Idea Principal

PoHI mide diferentes características conductuales durante la interacción del usuario, entre ellas:

- Tiempo de presión de teclas
- Tiempo entre pulsaciones
- Pausas cognitivas
- Asimetría motora
- Dinámica de correcciones
- Entropía conductual

Todas las métricas se procesan localmente en el dispositivo.

La información biométrica nunca abandona el equipo del usuario.

Únicamente se genera una prueba criptográfica de conocimiento cero que demuestra que la interacción cumple los requisitos del protocolo sin revelar datos sensibles.

---

## Estructura del Repositorio

```
paper/          Investigación académica
docs/           Documentación técnica
prototype/      Prototipo
client/         Cliente
server/         Servicios de verificación
circuits/       Circuitos zk-SNARK
verifier/       Verificador
research/       Investigación experimental
benchmarks/     Conjuntos de validación
```

---

## Estado del Proyecto

Estado actual:

- ✅ Investigación finalizada
- ✅ Manuscrito académico
- 🚧 Prototipo en desarrollo
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

---

## Licencia

La licencia será definida antes de la primera versión estable del protocolo.

---

## Aviso

PoHI es actualmente un proyecto activo de investigación.

El protocolo no debe considerarse listo para producción hasta completar su validación experimental.
