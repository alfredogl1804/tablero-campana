/**
 * Catálogo curado del ecosistema de proyectos del Monstruo.
 *
 * Cada entrada es la verdad doctrinal sobre un proyecto:
 *   - identidad (slug + nombre humano)
 *   - clasificación (kernel_core, production_app, interface, infrastructure, lab)
 *   - distrito al que pertenece (matchea board_data.json)
 *   - origen (GitHub repo) y deploy (Railway, Manus webdev, etc.)
 *
 * Esta lista la pueblan los seeds. Los pings de salud se acumulan en
 * `project_health_pings` y la tabla `connected_projects` mantiene el último
 * estado conocido.
 *
 * Excluye los repos efímeros del pipeline E2E (`monstruo-tbd-*`,
 * `monstruo-hace-*`) que existen como artefactos de prueba, no como nodos
 * del ecosistema.
 */

import type { InsertConnectedProject } from "../../drizzle/schema";

export type ProjectCategory =
  | "kernel_core"
  | "production_app"
  | "interface"
  | "infrastructure"
  | "lab"
  | "ephemeral_e2e";

export type ProjectStatus = "active" | "dormant" | "deprecated" | "unknown";

export const ECOSYSTEM_CATALOG: Omit<InsertConnectedProject, "createdAt" | "updatedAt">[] = [
  // ── KERNEL CORE ─────────────────────────────────────────────────────────
  {
    projectId: "el-monstruo",
    displayName: "El Monstruo (kernel core)",
    description:
      "Ecosistema de IA meta-orquestado. Núcleo del Monstruo: SOP, EPIA, MAOC, Protocolo Memento, bridge entre hilos, doctrina canónica.",
    category: "kernel_core",
    district: "cognicion",
    githubOwner: "alfredogl1804",
    githubRepo: "el-monstruo",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "python,fastapi,supabase,langgraph,railway,doctrina",
    status: "active",
    starX: 0,
    starY: 0,
  },
  {
    projectId: "tablero-campana",
    displayName: "Tablero de Campaña",
    description:
      "Mesa de trabajo isométrica 3D donde se ve el Monstruo entero. Truth Ledger del observatorio vivo. Snapshot persistente del genoma.",
    category: "kernel_core",
    district: "interfaces",
    githubOwner: "alfredogl1804",
    githubRepo: "tablero-campana",
    githubVisibility: "private",
    deployTarget: "manus_webdev",
    deployUrl: "https://monstruo-fmpgkidx.manus.space",
    stackTags: "react,three.js,trpc,drizzle,tidb,supabase,vite",
    status: "active",
    starX: 0,
    starY: -120,
  },
  {
    projectId: "forja-mcp",
    displayName: "La Forja (MCP Gateway)",
    description:
      "HTTP/SSE multiplexer de 7+ APIs hospedado en Railway. Gateway entre Manus y herramientas externas (gh, vercel, supabase, etc.) con telemetría y políticas.",
    category: "kernel_core",
    district: "operaciones",
    githubOwner: "alfredogl1804",
    githubRepo: "forja-mcp",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "python,mcp,sse,fastapi,railway,gateway",
    status: "active",
    starX: 140,
    starY: 60,
  },

  // ── PRODUCTION APPS ─────────────────────────────────────────────────────
  {
    projectId: "like-kukulkan-tickets",
    displayName: "TicketLike (Leones de Yucatán)",
    description:
      "Boletería de béisbol con mapa interactivo de butacas. Producción en uso. Stripe + TiDB + admin panel.",
    category: "production_app",
    district: "negocios",
    githubOwner: "alfredogl1804",
    githubRepo: "like-kukulkan-tickets",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "react,tidb,stripe,railway,admin,boleteria",
    status: "active",
    starX: 220,
    starY: -100,
  },
  {
    projectId: "fernando-dia-maestro-2026",
    displayName: "Día del Maestro 2026 (Fernando VJ)",
    description:
      "Dashboard operativo del show del Día del Maestro 2026. Coordinación de visuales, audio, timeline, chat de equipo.",
    category: "production_app",
    district: "negocios",
    githubOwner: "alfredogl1804",
    githubRepo: "fernando-dia-maestro-2026",
    githubVisibility: "private",
    deployTarget: "manus_webdev",
    stackTags: "react,realtime,evento,vj",
    status: "active",
    starX: 200,
    starY: 80,
  },
  {
    projectId: "observatorio-merida-2027",
    displayName: "Observatorio Electoral Mérida 2027",
    description:
      "Modelo bayesiano + análisis de sentimiento en tiempo real para elecciones Mérida 2027.",
    category: "production_app",
    district: "negocios",
    githubOwner: "alfredogl1804",
    githubRepo: "observatorio-merida-2027",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "python,bayesian,sentiment,electoral,realtime",
    status: "active",
    starX: 280,
    starY: 0,
  },
  {
    projectId: "crisol-8",
    displayName: "Crisol-8 (OSINT)",
    description: "Investigación OSINT — scripts y análisis (privado).",
    category: "production_app",
    district: "investigacion",
    githubOwner: "alfredogl1804",
    githubRepo: "crisol-8",
    githubVisibility: "private",
    deployTarget: "none",
    stackTags: "osint,investigacion,scripts",
    status: "active",
    starX: -260,
    starY: 60,
  },

  // ── INTERFACES ──────────────────────────────────────────────────────────
  {
    projectId: "el-monstruo-bot",
    displayName: "El Monstruo Bot (Telegram)",
    description:
      "Bot de Telegram MVP que da acceso conversacional al Monstruo. Hospedado en Railway.",
    category: "interface",
    district: "interfaces",
    githubOwner: "alfredogl1804",
    githubRepo: "el-monstruo-bot",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "python,telegram,bot,railway",
    status: "active",
    starX: -120,
    starY: -100,
  },
  {
    projectId: "el-monstruo-command-center",
    displayName: "Command Center (PWA)",
    description:
      "PWA de control del Monstruo. Una de las 6 interfaces canonizadas del Monstruo.",
    category: "interface",
    district: "interfaces",
    githubOwner: "alfredogl1804",
    githubRepo: "el-monstruo-command-center",
    githubVisibility: "private",
    deployTarget: "manus_webdev",
    stackTags: "react,pwa,interfaces",
    status: "dormant",
    starX: -100,
    starY: 100,
  },

  // ── INFRASTRUCTURE ──────────────────────────────────────────────────────
  {
    projectId: "biblia-github-motor",
    displayName: "Biblia GitHub Motor",
    description: "Motor de organización y memoria sobre repos de GitHub.",
    category: "infrastructure",
    district: "operaciones",
    githubOwner: "alfredogl1804",
    githubRepo: "biblia-github-motor",
    githubVisibility: "private",
    deployTarget: "none",
    stackTags: "github,memoria,operaciones",
    status: "active",
    starX: 60,
    starY: 180,
  },
  {
    projectId: "honcho-railway",
    displayName: "Honcho (memoria de agentes)",
    description: "Servicio Honcho desplegado en Railway (memoria episódica de agentes).",
    category: "infrastructure",
    district: "memoria",
    githubOwner: "alfredogl1804",
    githubRepo: "honcho-railway",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "honcho,memoria,railway",
    status: "dormant",
    starX: -160,
    starY: -180,
  },

  // ── LAB ─────────────────────────────────────────────────────────────────
  {
    projectId: "simulador-universal",
    displayName: "Simulador Universal de Escenarios",
    description:
      "Motor de simulación Agent-Based + Monte Carlo para escenarios electorales, financieros, crisis.",
    category: "lab",
    district: "investigacion",
    githubOwner: "alfredogl1804",
    githubRepo: "simulador-universal",
    githubVisibility: "private",
    deployTarget: "railway",
    stackTags: "python,abm,montecarlo,llm,simulacion",
    status: "dormant",
    starX: -240,
    starY: -60,
  },
  {
    projectId: "manus-memory-merida2027",
    displayName: "Memoria Mérida 2027",
    description: "Banco de memoria del proyecto electoral Mérida 2027.",
    category: "lab",
    district: "memoria",
    githubOwner: "alfredogl1804",
    githubRepo: "manus-memory-merida2027",
    githubVisibility: "private",
    deployTarget: "none",
    stackTags: "memoria,electoral",
    status: "dormant",
    starX: -200,
    starY: 160,
  },
  {
    projectId: "k365-knowledge-repo",
    displayName: "Kukulkán 365",
    description:
      "Distrito de Entretenimiento Climatizado — knowledge base & onboarding del proyecto K365.",
    category: "lab",
    district: "negocios",
    githubOwner: "alfredogl1804",
    githubRepo: "k365-knowledge-repo",
    githubVisibility: "private",
    deployTarget: "none",
    stackTags: "knowledge,entretenimiento,k365",
    status: "dormant",
    starX: 280,
    starY: 160,
  },
  {
    projectId: "el-mundo-de-tata",
    displayName: "El Mundo de Tata",
    description:
      "Juego interactivo padre-hija estilo Toca Boca. Aprendizaje con Renata.",
    category: "lab",
    district: "interfaces",
    githubOwner: "alfredogl1804",
    githubRepo: "el-mundo-de-tata",
    githubVisibility: "private",
    deployTarget: "manus_webdev",
    stackTags: "react,game,kids,personal",
    status: "dormant",
    starX: -60,
    starY: -200,
  },
  {
    projectId: "rug-carousel",
    displayName: "Rug Carousel (Las Vegas)",
    description: "Catálogo de alfombras contemporáneas para Las Vegas.",
    category: "lab",
    district: "negocios",
    githubOwner: "alfredogl1804",
    githubRepo: "rug-carousel",
    githubVisibility: "public",
    deployTarget: "manus_webdev",
    stackTags: "react,catalogo,negocio",
    status: "dormant",
    starX: 340,
    starY: 120,
  },
];

/**
 * Categorías que se renderizan en el mapa estelar por defecto
 * (los efímeros del pipeline E2E quedan ocultos).
 */
export const VISIBLE_CATEGORIES: ProjectCategory[] = [
  "kernel_core",
  "production_app",
  "interface",
  "infrastructure",
  "lab",
];
