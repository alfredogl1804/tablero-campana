# Consulta a Sabio #2 (Claude Opus 4.7) — Canvas R3F invisible, perspectiva forense

**Rol:** Sabio #2 del Consejo de los 6 (semilla v7.3, DSC-V-001). Tu fortaleza específica es el análisis forense profundo y el razonamiento causal en sistemas complejos. NO modo asistente genérico.

**Diferencia con los otros Sabios:** Gemini ya disparó (H1 fallida — preserveDrawingBuffer). Quiero que tu enfoque sea **distinto a un diagnóstico técnico convencional**. Pregúntate: ¿qué asume el desarrollador como "obvio" que en realidad podría estar mal? Las trampas escondidas. El bug que está en el espacio entre los archivos, no dentro de uno.

---

## El problema en una línea

Canvas R3F con 66 meshes se ve completamente negro en Safari iPhone real y en screenshot headless de Manus. El Canvas existe, WebGL vive, no hay errores, pero **nada se dibuja**.

## Lo que ya está descartado (con evidencia, no especulación)

| Hipótesis | Veredicto | Cómo se descartó |
|---|---|---|
| Componente no monta | DESCARTADA | Log real confirma mount con 66 nodes |
| WebGL Context Lost | DESCARTADA | Listener nunca dispara después de relajar gl config |
| Crash de React | DESCARTADA | Console limpia |
| Datos corruptos | DESCARTADA | Script Python verifica todos los nodos válidos |
| Falta de luces | DESCARTADA | Switch a meshBasicMaterial no resuelve |
| Zoom muy lejos | DESCARTADA | Zoom 60 (max) tampoco resuelve |
| Headless del sandbox | DESCARTADA | Safari iPhone real también muestra negro |
| preserveDrawingBuffer | DESCARTADA | Cambio a true no resolvió (hipótesis fallida de Gemini) |
| Canvas no existe | DESCARTADA | Probe magenta confirma div Canvas presente |

## Lo que SÍ está confirmado por probe magenta

Con `alpha: true` + CSS `background: magenta`, **toda el área del Canvas se ve completamente magenta**. Esto prueba que:
- El elemento `<canvas>` ocupa el espacio correcto (1280×720 en desktop)
- El contexto WebGL está activo (no rechaza el alpha)
- El background CSS detrás se ve a través del Canvas transparente

Pero NO prueba que los meshes 3D se estén dibujando.

---

## Configuración relevante

```tsx
// Container (Home.tsx)
<div className="fixed inset-0 overflow-hidden bg-background">
  <div className="absolute inset-0 z-0">
    <IsometricBoard data={boardData} ... />
  </div>
  <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(...)"}} />
  <div className="absolute inset-0 z-20 pointer-events-none">{/* HUD */}</div>
</div>

// IsometricBoard
<Canvas
  shadows={false}
  dpr={[1, 1.5]}
  gl={{ antialias: true, alpha: false, powerPreference: "default", preserveDrawingBuffer: true, ... }}
  style={{ background: "transparent", width: "100%", height: "100%" }}
>
  <color attach="background" args={["#16110d"]} />
  <fog attach="fog" args={["#16110d", 30, 90]} />
  <CameraRig zoomLevel={28} focusPosition={[0,0,0]} />
  <ForjaLighting />  {/* ambient + directional + hemisphere */}
  {data.districts.map(...)}  {/* 5 plataformas */}
  {data.nodes.map(...)}      {/* 66 edificios */}
  <ConnectionLines ... />
</Canvas>

// CameraRig
<OrthographicCamera
  ref={cameraRef}
  makeDefault
  position={[30, 30, 30]}
  zoom={28}
  near={0.1}
  far={200}
/>
// useFrame mueve targetPos + cameraRef.position con lerp, lookAt(targetPos), updateProjectionMatrix()
```

Todos los 66 nodos tienen posición real entre `[-11, 0, -11]` y `[13.2, 0, 11]`. La cámara mira a `(0, 0, 0)` desde `(30, 30, 30)`. Frustum near=0.1, far=200.

---

## Lo que quiero de ti (perspectiva forense)

**No me des un diagnóstico técnico genérico.** Asume que el desarrollador es competente y ya probó lo obvio. Pregúntate:

1. **¿Qué está haciendo el código que no es obvio cuando lo lees?**
   - El `<color attach="background" args={["#16110d"]} />` en R3F: ¿qué pasa exactamente? ¿setea `scene.background` a `new Color()`? ¿Puede estar interfiriendo con el clearColor del WebGL?
   - El `<OrthographicCamera makeDefault />` de drei: ¿cuándo exactamente reemplaza la cámara default de R3F? ¿Hay un primer frame donde la PerspectiveCamera default de R3F renderea con clearColor pero sin meshes visibles?
   - El `useFrame` que mueve la cámara: si NUNCA corre (porque `frameloop` está implícito en algún ancestor), la cámara se queda en su posición inicial. Pero `position=[30,30,30]` mirando a `(0,0,0)` debería ver el origen...
   - El `<fog attach="fog" args={["#16110d", 30, 90]} />`: el fog en R3F oscurece todo lo que esté entre 30 y 90 unidades. La cámara está a `sqrt(30²+30²+30²) ≈ 52` unidades del origen — **DENTRO del rango de fog**. ¿Y si el fog está absorbiendo todo el color porque su color (#16110d, casi negro) es muy oscuro y la atenuación con `far=90` mata el contraste?

2. **¿Hay algún CSS de orden superior que esté afectando?**
   - El container es `fixed inset-0` con `z-0`. ¿Algún ancestor tiene `transform`, `filter`, `mix-blend-mode`, `backdrop-filter` que pueda estar matando el Canvas?
   - El template de Manus webdev podría tener algún `body` o `#root` con `overflow: hidden` o `position` raro.

3. **¿El bug es de orden de hooks/componentes?**
   - Si `OrthographicCamera` se monta DESPUÉS de los meshes, durante el primer frame los meshes se renderean con la PerspectiveCamera default. Pero esa cámara está en `(0,0,5)` mirando a `(0,0,0)` con FOV 75 — los meshes deberían verse igual.

4. **¿Algún package incompatible con React 19?**
   - `@react-three/fiber 9.6.1` es la primera versión con soporte React 19. ¿Hay un bug conocido en esta versión?
   - `@react-three/drei 10.7.7` con R3F 9.6: ¿hay incompatibilidad?

---

## Tu respuesta debe seguir este formato

1. **Tres preguntas que el desarrollador NO se está haciendo** (las trampas escondidas).
2. **Una hipótesis principal** elegida después de razonarlas. NO genérica. Específica.
3. **Probe definitivo** — código exacto que confirme tu hipótesis con un resultado visual o un log con números específicos. Debe ser distinto a un cubo rojo (eso ya lo iba a probar).
4. **Fix exacto** si tu hipótesis se confirma.

## Reglas no negociables

- No repitas las hipótesis ya descartadas (tabla de arriba).
- No me digas que la hipótesis de Gemini era buena. Era específicamente errónea para este caso.
- No me sugieras un rewrite ni una librería distinta.
- Si tu confianza es < 75%, pide ver código específico que falta (qué archivo, qué líneas).
- Recuerda que el Sabio #1 (GPT-5.5 Pro) está respondiendo en paralelo a esta misma pregunta. Tu valor es ofrecer un ángulo COMPLEMENTARIO, no copiar su enfoque.

Dispara.
