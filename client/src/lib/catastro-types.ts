/**
 * Tipos canónicos del Catastro Visual Ledger.
 *
 * Generados por scripts/build_visual_ledger.py — fuente única de verdad
 * que ingiere los 3 JSONs reales del catastro y produce este shape.
 *
 * Cualquier divergencia entre estos tipos y el ledger real es un drift
 * (DSC-G-008). Si el shape cambia, se actualiza primero aquí y luego en
 * el script Python.
 */

export type EntityType = "AGENTE" | "TOOL" | "SUPPLIER";

/** Estados canónicos provenientes del catastro real. */
export type LedgerStatus = "vigente_2026" | "vigente_2026_self_referencia" | "degradado" | "aspirante";

export interface LedgerNodeBase {
  id: string;
  name: string;
  entity_type: EntityType;
  category: string;
  status: LedgerStatus;
  is_operable: boolean;
  description: string;
  /** Marcado true cuando la entry no existe aún en el catastro real y se inyecta sintéticamente. */
  synthetic: boolean;
  grid_position: [number, number];
}

export interface LedgerAgenteNode extends LedgerNodeBase {
  entity_type: "AGENTE";
  provider?: string;
  version?: string;
  lessons?: string;
  interfaces?: string[];
  auth_pattern?: string;
  biblia_path?: string;
  biblia_size_bytes?: number;
}

export interface LedgerToolNode extends LedgerNodeBase {
  entity_type: "TOOL";
  provider?: string;
  url?: string;
  pricing?: string | null;
  api_available?: string | null;
  maturity?: string | null;
  oss_alternatives?: string[];
}

export interface LedgerSupplierNode extends LedgerNodeBase {
  entity_type: "SUPPLIER";
  city?: string | null;
  address?: string | null;
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  representative_cases?: string | null;
}

export type LedgerNode = LedgerAgenteNode | LedgerToolNode | LedgerSupplierNode;

export interface LedgerDistrict {
  key: "AGENTES" | "TOOLS" | "SUPPLIERS";
  label: string;
  subtitle: string;
  color: string;
  grid_origin: [number, number];
}

export interface LedgerCategory {
  key: string;
  entity_type: EntityType;
  category: string;
  count: number;
}

export interface LedgerMetadata {
  generated_at: string;
  generated_by: string;
  source_files: string[];
  total_nodes: number;
  total_agentes: number;
  total_tools: number;
  total_suppliers: number;
  operable_count: number;
  synthetic_count: number;
  policy: string;
  version: string;
}

export interface CatastroLedger {
  metadata: LedgerMetadata;
  districts: LedgerDistrict[];
  categories: LedgerCategory[];
  nodes: LedgerNode[];
}

/**
 * Etiqueta humana en español por categoría técnica del catastro.
 * No incluye TODAS las categorías — para las no mapeadas, el componente
 * usa la categoría cruda con un formateador (snake_case → Title Case).
 */
export const CATEGORY_LABEL_ES: Record<string, string> = {
  // Agentes
  computer_use_agent: "Agente que usa la computadora",
  ide_native_coding_agent: "Programador en IDE",
  managed_cloud_coding_agent: "Programador en la nube",
  ide_extension_coding_agent: "Extensión de IDE",
  autonomous_software_engineer: "Ingeniero autónomo",
  embodied_robotics_agent: "Robot encarnado",
  voice_first_agent: "Agente de voz",
  open_source_general_agent: "Agente abierto general",
  long_context_agentic_llm: "LLM de contexto largo",
  ide_native_aws_coding_agent: "Programador AWS",
  specialized_research_agent: "Investigador especializado",
  no_code_workflow_agent: "Flujos sin código",
  general_purpose_agent_platform: "Plataforma general",
  consumer_assistant: "Asistente de consumo",
  agentic_research_assistant: "Asistente investigador",
  humanoid_robotics_agent: "Robot humanoide",
  browser_automation_agent: "Automatizador web",
  agentic_browser: "Navegador inteligente",
  enterprise_search_assistant: "Buscador empresarial",
  browser_research_agent: "Investigador en navegador",
  open_source_gui_agent: "Agente GUI abierto",
  // Tools
  renderers_3d_ai: "Renderizadores 3D",
  video_generation: "Generación de video",
  voice_ai: "Voz IA",
  document_parsing: "Lectura de documentos",
  code_generation: "Generación de código",
  image_generation: "Generación de imágenes",
  data_extraction_web_scraping: "Extracción de datos web",
  ai_search_rag: "Búsqueda IA y RAG",
  // Suppliers
  camaras_y_colegios: "Cámaras y colegios",
  despachos_contables_fiscales: "Despachos contables",
  despachos_legales_notarias: "Despachos legales",
  agencias_marketing_branding: "Agencias de marketing",
  productoras_audiovisuales: "Productoras audiovisuales",
  estudios_arquitectura_interiores: "Arquitectura e interiores",
  desarrolladoras_software_ti: "Desarrolladoras de software",
  imprentas_eventos_catering_logistica: "Imprentas, eventos y logística",
};

export function categoryLabel(category: string): string {
  if (CATEGORY_LABEL_ES[category]) return CATEGORY_LABEL_ES[category];
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const ENTITY_LABEL_ES: Record<EntityType, string> = {
  AGENTE: "Agente",
  TOOL: "Herramienta",
  SUPPLIER: "Proveedor",
};

export const STATUS_LABEL_ES: Record<LedgerStatus, string> = {
  vigente_2026: "Vigente 2026",
  vigente_2026_self_referencia: "Vigente (auto-ref.)",
  degradado: "Degradado",
  aspirante: "Aspirante",
};
