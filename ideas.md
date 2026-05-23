# Ideas de Diseño — Tablero de Campaña (Quantum Realm v2.0)

Tres aproximaciones de diseño para un Command Center estilo videojuego de estrategia, operado por un usuario de 67 años sin conocimiento técnico.

---

<response>
<text>

## Idea 1: "Forja Industrial Brutalista"

**Design Movement:** Brutalismo industrial refinado — la marca canónica de El Monstruo (naranja forja + grafito + acero). Inspirado en consolas de control industrial reales (NASA Apollo, refinería petrolera) pero refinado con la sensibilidad de Teenage Engineering.

**Core Principles:**
- Materialidad táctil: Cada superficie tiene textura (grain noise, brushed metal, glass)
- Luz forjada: Iluminación cálida (naranja #F97316) emanando del centro
- Tipografía dual: JetBrains Mono para datos/números, Inter Display para títulos
- Gravedad visual: Elementos pesados al centro, ligeros en bordes

**Color Philosophy:**
- Fondo: Grafito profundo (oklch(0.18 0.005 65)) — sensación de noche en el taller
- Acento primario: Naranja Forja (#F97316) — emisión de luz desde los nodos activos
- Acero frío (#A8A29E) — para elementos secundarios y bordes
- Verde plasma (oklch(0.7 0.18 145)) — solo para indicadores de salud OK
- Rojo alarma (oklch(0.6 0.25 25)) — solo para gaps críticos

**Layout Paradigm:**
Tablero isométrico ocupando 70% de pantalla. HUD lateral izquierdo fijo (Live Pulse) con 280px ancho. Omnibox flotante centro-inferior con elevación visual marcada (sombra forjada). Context Cards aparecen flotantes a la derecha al click, con física de springs.

**Signature Elements:**
1. Líneas de luz naranja conectando nodos (como cables de fibra óptica brillando)
2. Partículas ascendentes de los edificios activos (como humo de chimeneas industriales pero refinadas)
3. Marco de tablero con bisel metálico — el viewport 3D parece una mesa de planos arquitectónica

**Interaction Philosophy:**
Cada acción produce respuesta táctil visual. Click = pulso de luz expansivo. Hover = brillo sutil. Drag = el cursor se vuelve magnético. Sin sonido (silencio respetuoso para uso prolongado).

**Animation:**
Springs de Framer Motion con stiffness 200, damping 25 (sólidas, no rebotes excesivos). Entrada de Context Cards: fade + slide + scale 0.95→1. Cámara isométrica con lerp suave de 0.08 (paneo asistido). Edificios "respiran" con scale 1.0→1.02 sutilmente cada 4s.

**Typography System:**
- Display (títulos, omnibox): "Inter Display" 600 con tracking -0.02em
- Body (descripciones): "Inter" 400 con line-height 1.6
- Numérico/técnico: "JetBrains Mono" 500 — para coordenadas, métricas, IDs
- Tamaños: text-base mínimo (16px), text-xl para omnibox, text-2xl para títulos de Context Cards

**Por qué encaja con el problema:**
Refleja la marca canónica del Monstruo. Un señor de 67 años reconoce inmediatamente la metáfora industrial (taller, herramientas, planos). La luz forjada da calidez, no es frío como un dashboard tech genérico.

</text>
<probability>0.06</probability>
</response>

<response>
<text>

## Idea 2: "Atlas Cartográfico Vivo"

**Design Movement:** Cartografía moderna estilo Stamen Maps + Apple Maps — un atlas vivo donde cada componente es territorio explorable. Tipografía editorial premium (estilo The New York Times Magazine) combinada con rigor visual de Linear/Notion.

**Core Principles:**
- Profundidad espacial: El tablero tiene múltiples niveles (suelo, edificios, atmósfera, satélites)
- Legibilidad sobre todo: Tipografía editorial de alta jerarquía
- Gradientes cartográficos: Distritos con tinte topográfico sutil
- Elegancia minimalista: Mucho espacio en blanco, decisiones tipográficas precisas

**Color Philosophy:**
- Fondo: Blanco hueso cálido (oklch(0.98 0.005 85)) — papel de mapa antiguo refinado
- Distritos como tintas de cartografía: azul cobalto (Cognición), violeta polvoso (Interfaces), verde musgo (Infraestructura), terracota (Capacidades), gris niebla (Futuro)
- Tipografía: negro suave (oklch(0.2 0.005 65)) sobre fondo claro
- Highlights: amarillo cadmio (oklch(0.85 0.15 95)) para selección activa

**Layout Paradigm:**
Vista isométrica con cámara más alta (60° vs 45°) para sensación de "mirando un mapa desde arriba". Brújula decorativa en esquina superior-derecha. Escala/leyenda en inferior-izquierda. Omnibox centrada como buscador de Apple Maps. Context Cards estilo "ficha de territorio" con tipografía editorial.

**Signature Elements:**
1. Líneas isópetas (curvas de nivel) en el suelo de cada distrito mostrando "salud topográfica"
2. Iconografía de mapa antiguo (compás, regla, escala) decorativos en bordes
3. Tipografía con drop caps editoriales en Context Cards — la primera letra del nombre del componente es grande y elegante

**Interaction Philosophy:**
Sensación de explorar un mapa físico. Hover sobre un distrito = se "alza" sutilmente del fondo (translateZ). Click en nodo = la cámara hace dolly-zoom suave. Sin barras de carga: todo aparece con fade orgánico.

**Animation:**
Transiciones largas (600-800ms) con easing cubic-bezier(0.32, 0.72, 0, 1). Las líneas de conexión se "trazan" como si una pluma estuviera dibujándolas. Edificios al aparecer: emerge desde el suelo con bounce sutil.

**Typography System:**
- Display: "Fraunces" (serif moderno) — 700 weight para títulos
- Subtítulos: "Inter Display" 500
- Body: "Source Serif Pro" — para descripciones, da sensación editorial
- Datos: "Söhne Mono" — números con elegancia
- Tamaños: text-lg base, text-3xl títulos, text-sm metadata

**Por qué encaja con el problema:**
La metáfora de mapa es universal e intuitiva — todos saben leer un mapa. Para un señor de 67 años, esto es más cercano a un atlas o plano arquitectónico que a un videojuego intimidante. La elegancia editorial transmite seriedad y respeto, no infantilismo.

</text>
<probability>0.05</probability>
</response>

<response>
<text>

## Idea 3: "Comando Holográfico Cinemático"

**Design Movement:** Inspirado en HUDs cinemáticos (Iron Man Jarvis, Minority Report, Blade Runner 2049) pero ejecutado con la disciplina del diseño actual — no neón saturado de los 80s, sino refinamiento futurista con glassmorphism profundo y tipografía técnica suiza.

**Core Principles:**
- Translucidez controlada: Glassmorphism con backdrop-blur preciso, sin saturación
- Cyan eléctrico como color de información (no azul aburrido)
- Movimiento como información: Cada animación comunica algo
- Densidad informativa elegante — Bloomberg Terminal pero hermoso

**Color Philosophy:**
- Fondo: Negro azulado profundo (oklch(0.12 0.02 250)) con ligero tinte espacial
- Cyan eléctrico: oklch(0.78 0.18 200) — para datos primarios, conexiones
- Magenta de plasma: oklch(0.7 0.25 340) — solo para alertas y selección activa
- Verde de vida: oklch(0.75 0.2 155) — indicadores de salud
- Glass white: rgba(255, 255, 255, 0.06) con backdrop-blur(24px) para paneles

**Layout Paradigm:**
Tablero 3D con perspectiva ortográfica pero ligeramente inclinada (no isométrico puro). HUD flotante con paneles de glassmorphism que parecen "holografías" superpuestas. Omnibox con glow cyan al focus. Context Cards con efecto de cristal templado.

**Signature Elements:**
1. Líneas de datos animadas viajando entre nodos (como tráfico de información en tiempo real)
2. Anillo de coordenadas alrededor del tablero (estilo radar/sonar) que pulsa cada 8s
3. Reticule cinemático que sigue al cursor sutilmente — sensación de "targeting system"
4. Particle field ambiental sutil en el fondo (no estridente)

**Interaction Philosophy:**
Cada interacción se siente "amplificada" como un sistema militar de alta precisión. Hover = el nodo emite anillo expansivo + datos aparecen flotantes. Click = animación de "lock-on target" con corchetes que se cierran. Drag = trayectoria parabólica visualizada.

**Animation:**
Springs rápidos pero precisos (stiffness 400, damping 30). Aparición de UI: fade + scale 0.92→1 + ligero glow. Líneas de datos: pulso recursivo. Cámara con micro-movimientos constantes (parallax muy sutil) para que se sienta "vivo" sin marear.

**Typography System:**
- Display: "Space Grotesk" — geométrica, futurista pero legible
- Body: "Inter" — confiable y limpia
- Mono: "JetBrains Mono" — para coordenadas, datos técnicos
- Detalles: "Eurostile Extended" para etiquetas pequeñas (cinematic touch)
- Tamaños: text-base mínimo, text-2xl para títulos, font-feature-settings: 'tnum' para números tabulares

**Por qué encaja con el problema:**
La metáfora cinemática es la que conecta el cerebro de cualquier persona (incluso un señor de 67 años) con la idea de "estoy operando un sistema poderoso e importante". Es la estética que hace sentir al usuario como Tony Stark frente a Jarvis, no como un programador frente a una terminal. La densidad informativa elegante permite mostrar mucho sin abrumar.

</text>
<probability>0.07</probability>
</response>

---

## Decisión

Voy a comprometerme con la **Idea 1: "Forja Industrial Brutalista"** por estas razones:

1. **Alineación canónica con la marca del Monstruo** (naranja forja #F97316 + grafito + acero) — el AGENTS.md del repo es explícito sobre esto.

2. **Metáfora clara para un señor de 67 años**: el taller/forja es una imagen mental que cualquier hombre de su generación reconoce inmediatamente. Es construir piezas reales en una mesa de planos.

3. **El Monstruo ES un creador y forjador** (arquetipo Creador + Mago canonizado). La estética industrial refinada es la materialización visual de ese arquetipo.

4. **Diferenciación**: el sitio actual tiene estética sci-fi genérica. La Forja Industrial es distintiva, propia, y no se confunde con ningún otro dashboard del mundo.

5. **Calidez visual**: el naranja forja sobre grafito da calidez (no frialdad técnica), lo que reduce la barrera emocional de un usuario no técnico.

Las otras dos quedaron descartadas:
- Idea 2 (Atlas) demasiado pasiva — no transmite "trabajo en progreso", se siente como documentar lo que ya está
- Idea 3 (Holográfico) demasiado intimidante para usuario de 67 años — los HUDs cinemáticos pueden sentirse como cabina de F-35, no de mesa de trabajo
