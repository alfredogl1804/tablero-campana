# Consulta a Sabio #3 (Gemini 3.1 Pro) — Diagnóstico: Canvas R3F renderiza pero invisible

**Rol:** Sabio #3 del Consejo (DSC-V-001). NO modo chat genérico. Esta es una consulta técnica de diagnóstico WebGL/R3F con evidencia trazable. Tu rol es **identificar la causa raíz** con base en los logs reales que abajo te paso, NO especular con hipótesis genéricas. Si la evidencia te lleva a una sola causa, dame esa causa con su fix exacto. Si la evidencia es ambigua, dime exactamente qué probe agregar para diferenciar.

---

## Contexto del bug (verificado con logs reales del navegador, no especulación)

Proyecto **`tablero-campana`** — React 19 + Vite + `@react-three/fiber` 9.6.1 + `@react-three/drei` 10.7.7 + `three` 0.184.0.

Componente afectado: `client/src/components/board/IsometricBoard.tsx` (Canvas R3F isométrico que pinta 66 prismas distribuidos en 5 distritos sobre un tablero 2D).

**Síntoma:** el área del Canvas se ve **completamente negra** en el screenshot. El HUD 2D overlay (sidebar, toolbar, omnibox) se ve perfecto. Solo el área del Canvas 3D está vacía.

---

## Evidencia REAL de logs (timestamps en CST 2026-05-24)

### 1. El componente sí monta con datos correctos
```
[IsometricBoard] mount | nodes: 66 | districts: 5 | first node: embrion_loop | zoom: 60
```
- `data.nodes.length = 66` (correcto)
- `data.districts.length = 5` (correcto)
- Todos los nodos tienen `grid_position: [number, number]` válido (verificado con script Python).

### 2. El Canvas WebGL sí se crea
```
[IsometricBoard] Canvas created | size: {width:1280, height:720, top:0, left:0} | dpr: 1
```
Después de relajar la config WebGL (powerPreference "default", failIfMajorPerformanceCaveat false, shadows false, dpr [1, 1.5]), **el handler `onCreated` se dispara** con tamaño correcto 1280×720.

### 3. NO hay "WebGL Context Lost" después de la relajación
Antes de relajar la config aparecía:
```
THREE.WebGLRenderer: Context Lost.
```
Después de la relajación, **ya no aparece**. El listener `webglcontextlost` que agregué nunca dispara. Eso significa que el contexto está vivo.

### 4. NO hay errores de React/runtime
El último error con stack apuntaba a `IsometricBoard.tsx:330:53` pero ese error es de hace 6 horas con una versión vieja (el archivo hoy tiene 277 líneas). Hoy no hay errores.

### 5. Diagnóstico que ya descarté
- **No es zoom mal calibrado:** probé `zoomLevel = 60` (el máximo del toolbar) y el toolbar reporta "214%" aplicado, pero sigue negro.
- **No son luces:** cambié `meshStandardMaterial` (que requiere luces) por **`meshBasicMaterial`** (que NO requiere luces) en los edificios principales. Sigue negro. Eso descarta que las luces sean el problema.
- **No es Context Lost.**
- **No es crash de React.**
- **No es datos vacíos.**

---

## Configuración relevante del Canvas

```tsx
<Canvas
  shadows={false}
  dpr={[1, 1.5]}
  gl={{
    antialias: true,
    alpha: false,
    powerPreference: "default",
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
  }}
  style={{ background: "transparent", width: "100%", height: "100%" }}
  onCreated={(state) => { ... }}
>
  <color attach="background" args={["#16110d"]} />
  <fog attach="fog" args={["#16110d", 30, 90]} />
  <CameraRig zoomLevel={zoomLevel} focusPosition={focusPosition} />
  <ForjaLighting />
  {data.districts.map(...)}  // 5 plataformas
  {data.nodes.map(...)}      // 66 edificios
  <ConnectionLines ... />
</Canvas>
```

### Cámara (OrthographicCamera vía CameraRig)

```tsx
function CameraRig({ zoomLevel, focusPosition }) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const targetPos = useRef({ x: 0, z: 0 });

  useFrame(() => {
    if (!cameraRef.current) return;
    targetPos.current.x += (focusPosition[0] - targetPos.current.x) * 0.08;
    targetPos.current.z += (focusPosition[2] - targetPos.current.z) * 0.08;

    cameraRef.current.position.x += (targetPos.current.x + 30 - cameraRef.current.position.x) * 0.06;
    cameraRef.current.position.z += (targetPos.current.z + 30 - cameraRef.current.position.z) * 0.06;
    cameraRef.current.zoom += (zoomLevel - cameraRef.current.zoom) * 0.12;
    cameraRef.current.lookAt(targetPos.current.x, 0, targetPos.current.z);
    cameraRef.current.updateProjectionMatrix();
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[30, 30, 30]}
      zoom={zoomLevel}
      near={0.1}
      far={200}
    />
  );
}
```

### Una "Building" típica (después del downgrade a basic material)

```tsx
<mesh position={[0, height / 2, 0]}>
  <boxGeometry args={[width, height, width]} />
  <meshBasicMaterial
    color={color}        // color válido del distrito
    transparent={opacity < 1}
    opacity={opacity * dimOpacity}
    wireframe={isWireframe}
  />
</mesh>
```

`position` recibido es resultado de `gridToWorld(gx, gy)` que devuelve `[(gx-6)*TILE_SIZE, 0, (gy-6)*TILE_SIZE]` con `TILE_SIZE = 2.2`. Para `embrion_loop` con `grid_position=[6,6]` daría `[0, 0, 0]` — sobre el origen.

---

## Pregunta concreta

**Con esta evidencia, ¿cuál es la causa más probable de que el Canvas WebGL tenga contexto válido y `onCreated` dispare correctamente, pero NINGÚN mesh (ni con basic material, ni con luces, ni con zoom máximo) sea visible en el screenshot del navegador?**

### Hipótesis que quiero que evalúes ordenadas por probabilidad

**H1: Headless Chrome del proxy de Manus no inicializa WebGL en screenshots.**
El Canvas funciona en navegadores reales pero el screenshot del sandbox no captura WebGL frames. Esto sería un falso positivo del screenshot, no un bug real.

**H2: La cámara ortográfica está mirando lejos del board.**
Con `position=[30,30,30]` y `lookAt(0,0,0)`, debería ver el origen. Pero el `lerp` agrega `+30` al target en X y Z, lo que hace que la cámara apunte a `(30, 0, 30)` después del converge — ese punto es la esquina del distrito Interfaces, no el centro. ¿Está fuera del frustum ortográfico?

**H3: El frustum del OrthographicCamera está mal calibrado para R3F.**
R3F maneja `OrthographicCamera` con `args=[left, right, top, bottom, near, far]` pero el componente de drei no recibe esos args — solo `zoom`. ¿El frustum default de drei es `[-1, 1, 1, -1]` y todos los edificios quedan fuera?

**H4: `near={0.1}` y `far={200}` con `position=[30,30,30]` mirando a `(0,0,0)` da una distancia de `sqrt(30² + 30² + 30²) ≈ 52`. Está dentro del rango. Pero el Z near plane de un OrthographicCamera está medido desde la cámara hacia adelante — si el ángulo de mirada hace que `targetPos.x + 30 = 30` esté DETRÁS de la cámara visualmente, los edificios se clipean.**

**H5: El `<color attach="background" args={["#16110d"]} />` cubre todo porque `#16110d` es casi negro y los edificios están detrás del color background mesh.**
NO debería ser eso (attach="background" setea `scene.background`, no agrega un mesh), pero quiero descartarlo.

---

## Lo que necesito de ti (formato estricto)

1. **Veredicto:** ¿cuál de las 5 hipótesis (H1-H5) es la más probable con base en MI evidencia, no en teoría general?
2. **Fix exacto:** un diff TypeScript concreto, no descripción narrativa.
3. **Probe definitivo:** un `console.log` o un mesh debug específico que confirme tu hipótesis ANTES de aplicar el fix. Por ejemplo: "Agrega un `<mesh position={[0,0,0]}><boxGeometry args={[5,5,5]}/><meshBasicMaterial color='red'/></mesh>` dentro del Canvas. Si aparece un cubo rojo gigante en el centro de pantalla, descarta H2/H4 y confirma H3."

---

## Reglas no negociables

- No me digas "puede ser muchas cosas". Elige UNA.
- No me sugieras "rewrite completo". El código no está roto en arquitectura, está roto en un detalle.
- Si tu confianza es < 70%, **dime "necesito ver X archivo o Y log más"** y dime exactamente cuál.
- No me recomiendes downgrade de versiones. Tres.js 0.184 y R3F 9.6 son las versiones canónicas del proyecto.
- No me recomiendes cambiar a una librería distinta.

Dispara.
