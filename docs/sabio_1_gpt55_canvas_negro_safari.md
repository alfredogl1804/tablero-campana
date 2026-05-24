# Consulta a Sabio #1 (GPT-5.5 Pro) — Canvas R3F negro en Safari iPhone real

**Rol:** Sabio #1 del Consejo de los 6 (semilla v7.3, DSC-V-001). Esta es una consulta técnica de diagnóstico, NO modo chat genérico.

**Tu tarea:** identificar la causa raíz de un bug de WebGL/Three.js con base en evidencia EMPÍRICA validada en navegador real. El Sabio #3 (Gemini 3.1 Pro) ya intentó y se equivocó — su hipótesis fue refutada por el test final. Necesito una mirada fresca y rigurosa.

---

## Contexto del proyecto

- Stack: **React 19 + Vite + `@react-three/fiber` 9.6.1 + `@react-three/drei` 10.7.7 + `three` 0.184.0**
- Componente: `IsometricBoard` — Canvas R3F que pinta 66 prismas distribuidos sobre 5 plataformas (distritos) en un tablero isométrico.
- Sitio publicado en producción: `https://monstruo-fmpgkidx.manus.space` (Cloudflare Workers + Manus webdev).
- El HUD 2D (sidebar, toolbar, omnibox) se ve perfecto en todas las plataformas. **Solo el área del Canvas 3D se ve completamente negra**.

---

## Evidencia empírica acumulada (NO especulación)

### Lo que YA confirmé y descarté

1. **El componente monta con datos correctos.** Log real: `[IsometricBoard] mount | nodes: 66 | districts: 5 | first node: embrion_loop | zoom: 28`.
2. **El Canvas WebGL se crea correctamente.** Log real: `[IsometricBoard] Canvas created | size: {width:1280, height:720, top:0, left:0} | dpr: 1`. El handler `onCreated` del `<Canvas>` dispara.
3. **No hay WebGL Context Lost** después de relajar `powerPreference` a `"default"` y `failIfMajorPerformanceCaveat: false`. El listener `webglcontextlost` nunca dispara.
4. **No hay errores de React/runtime.** Console limpio.
5. **No es problema de luces.** Cambié `meshStandardMaterial` (requiere luces) por `meshBasicMaterial` (no requiere luces) en todos los 66 edificios — sigue negro.
6. **No es zoom mal calibrado.** Forcé `zoom = 60` (máximo del toolbar, "214%" aplicado) — sigue negro.
7. **No es `preserveDrawingBuffer`** (la hipótesis fallida del Sabio #3). Lo cambié a `true` — sigue negro tanto en screenshot del sandbox **como en Safari del iPhone real del usuario** (confirmado con foto del iPhone esta noche).
8. **El DOM detrás del Canvas SÍ se ve.** Hice probe con `alpha: true` + CSS `background: magenta` y el screenshot mostró toda el área completamente magenta. Eso prueba que:
   - El `<canvas>` element existe con su tamaño correcto en el DOM.
   - El Canvas con alpha:true deja ver el background CSS.
   - PERO eso NO prueba que los meshes 3D se estén dibujando, solo que el div del Canvas existe.

### Nueva evidencia crítica

**El bug afecta a Safari del iPhone real del usuario,** no solo a los screenshots headless del sandbox. Foto del iPhone confirma: HUD perfecto, área del Canvas completamente negra. Esto descarta cualquier hipótesis de "es problema del headless" y confirma que es un bug real de runtime que afecta a usuarios.

---

## Configuración actual del Canvas

```tsx
<Canvas
  shadows={false}
  dpr={[1, 1.5]}
  gl={{
    antialias: true,
    alpha: false,
    powerPreference: "default",
    preserveDrawingBuffer: true,
    failIfMajorPerformanceCaveat: false,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
  }}
  style={{ background: "transparent", width: "100%", height: "100%" }}
  onCreated={(state) => {
    const canvas = state.gl.domElement;
    console.log("[IsometricBoard] Canvas created | size:", state.size, " | dpr:", state.gl.getPixelRatio());
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      console.error("[IsometricBoard] WebGL context lost", event);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      console.log("[IsometricBoard] WebGL context restored");
    });
  }}
>
  <color attach="background" args={["#16110d"]} />
  <fog attach="fog" args={["#16110d", 30, 90]} />
  <CameraRig zoomLevel={zoomLevel} focusPosition={focusPosition} />
  <ForjaLighting />
  {data.districts.map((d) => <DistrictPlatform key={d.id} district={d} />)}
  {data.nodes.map((node) => <Building key={node.id} node={node} ... />)}
  <ConnectionLines ... />
</Canvas>
```

### Container del Canvas en Home.tsx

```tsx
<div className="fixed inset-0 overflow-hidden bg-background">
  <div className="absolute inset-0 z-0">
    <IsometricBoard data={boardData} ... />
  </div>
  {/* Vignette ambient */}
  <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(...)" }} />
  {/* HUD overlay */}
  <div className="absolute inset-0 z-20 pointer-events-none">...</div>
</div>
```

### Cámara

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

`zoomLevel` arranca en `28`. `focusPosition` arranca en `[0, 0, 0]`.

### Edificio típico (66 instancias)

```tsx
<group position={position} onClick={...}>
  {/* Edificio principal — prisma */}
  <mesh position={[0, height / 2, 0]}>
    <boxGeometry args={[width, height, width]} />
    <meshStandardMaterial
      color={color}             // hex válido del distrito (ej "#3a82f6")
      emissive={emissive}
      emissiveIntensity={emissiveIntensity * dimOpacity}
      roughness={0.45}
      metalness={0.6}
    />
  </mesh>
</group>
```

`position` = `gridToWorld(grid_position[0], grid_position[1])` con `TILE_SIZE = 2.2`, centrado en origen. Para el primer nodo `embrion_loop` con `grid_position=[6,6]` da `[0, 0, 0]`.

Para los 66 nodos los rangos reales de `grid_position` van de `[1,1]` a `[12,11]`, dando posiciones mundo de `~[-11, 0, -11]` a `~[13.2, 0, 11]`. Box completo: ~24 unidades de ancho × 22 unidades de profundidad.

### Distritos (plataformas)

```tsx
function DistrictPlatform({ district }) {
  const [w, h] = district.grid_size;   // ej [4, 6]
  const [ox, oy] = district.grid_origin; // ej [0, 0]
  const px = (ox - 6 + w/2) * TILE_SIZE;
  const pz = (oy - 6 + h/2) * TILE_SIZE;
  return (
    <mesh position={[px, -0.1, pz]} receiveShadow>
      <boxGeometry args={[w * TILE_SIZE, 0.1, h * TILE_SIZE]} />
      <meshStandardMaterial color={district.color} opacity={0.3} transparent />
    </mesh>
  );
}
```

---

## Lo que NO he probado todavía

- Inyectar un mesh debug en `[0, 5, 0]` con `meshBasicMaterial` rojo gigante DENTRO del Canvas (no como hijo de map) para ver si **al menos UN mesh** se ve.
- Verificar el frustum de la `OrthographicCamera` de drei. ¿Tiene `left/right/top/bottom` por default? Si solo recibe `zoom` y depende del aspect ratio del Canvas, ¿qué pasa con 1280×720 + zoom 28?
- Verificar el order de mount: ¿`OrthographicCamera` con `makeDefault` se aplica ANTES de que los meshes se rendereen, o hay un primer frame con la cámara default de R3F (Perspective) que renderea vacío y luego se cambia?
- Verificar si `useFrame` en `CameraRig` está corriendo (es el único que mueve la cámara — si nunca corre, la cámara se queda en `position=[30,30,30]` mirando al `(0,0,0)` default sin updateProjectionMatrix después del zoom).

---

## Tu pregunta

**Dado que:**
- El Canvas existe (probado con magenta)
- WebGL no pierde contexto
- Los meshes se mapean (66 instancias) sin error
- El bug afecta tanto al headless screenshot como a Safari iPhone real
- Cambiar materials de Standard a Basic no resuelve
- Cambiar zoom de 28 a 60 no resuelve

**¿Cuál es la causa raíz más probable de que ningún mesh sea visible?**

### Formato de respuesta obligatorio

1. **Veredicto:** UNA hipótesis nombrada (no "podría ser X, Y o Z"). Si tu confianza es < 80%, dime exactamente qué necesitas ver más (archivo, log, captura específica).
2. **Razonamiento técnico:** 3-5 frases explicando por qué esta hipótesis es la más consistente con TODA la evidencia descartada arriba.
3. **Probe definitivo:** una modificación específica al código (diff) que confirme o refute tu hipótesis ANTES de aplicar el fix. Debe ser una sonda que produzca un resultado VISUAL inequívoco (cubo rojo gigante en el origen, log con números específicos, etc.).
4. **Fix exacto:** diff TypeScript concreto si tu hipótesis se confirma.

### Reglas no negociables

- No me digas "puede ser muchas cosas". Elige UNA.
- No me sugieras rewrite completo. El código tiene un detalle roto, no la arquitectura.
- No me recomiendes downgrade de versiones ni cambio a otra librería.
- Si quieres ver más código (archivos completos de `IsometricBoard.tsx`, `Building.tsx`, `Home.tsx`), pídelo explícitamente.
- Recuerda que el Sabio #3 ya falló con la hipótesis "preserveDrawingBuffer". No repitas esa.

Dispara.
