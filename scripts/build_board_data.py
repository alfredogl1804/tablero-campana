#!/usr/bin/env python3
"""
build_board_data.py — Pipeline cero-drift del Tablero del Monstruo.

Lee la fuente única de verdad (MONSTRUO_GENOME.yaml del repo del Monstruo,
montado vía FUSE en /mnt/desktop/el-monstruo/) y proyecta los componentes
reales del kernel sobre los 5 distritos del Tablero.

Distritos:
  - cognicion        → kernel.core + memory_systems + intelligence
  - interfaces       → kernel.interfaces + satellites tipo transport/interface
  - infraestructura  → production.kernel + supabase + memory_plane + apps/la-forja
  - capacidades      → kernel.product + kernel.operational + kernel.governance + custom_rpcs
  - futuro           → gaps + domain_embriones_doctrine_only + satellites aspirantes

Si el mount canónico no está disponible (CI, máquina sin desktop conectado),
cae a la copia local en scripts/board_sources/MONSTRUO_GENOME.yaml.

Salida:
  client/src/data/board_data.json  (espejo para import directo en frontend)
  client/public/data/board_data.json  (servido como asset estático)

Uso:
  python3 scripts/build_board_data.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    print("[board] FATAL: PyYAML no instalado. Ejecuta: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent

CANONICAL_GENOME = Path("/mnt/desktop/el-monstruo/MONSTRUO_GENOME.yaml")
LOCAL_GENOME = ROOT / "scripts" / "board_sources" / "MONSTRUO_GENOME.yaml"

if CANONICAL_GENOME.exists():
    GENOME_PATH = CANONICAL_GENOME
    SOURCE_MODE = "canonical_mount"
else:
    GENOME_PATH = LOCAL_GENOME
    SOURCE_MODE = "local_snapshot_fallback"

OUT_SRC = ROOT / "client" / "src" / "data" / "board_data.json"
OUT_PUBLIC = ROOT / "client" / "public" / "data" / "board_data.json"

# ───────────────────────────────────────────────────────────────────
# Definición canónica de los 5 distritos del Tablero.
# Mantiene compatibilidad con el shape que ya consume client/src/lib/board-types.ts
# ───────────────────────────────────────────────────────────────────
DISTRICTS_DEF = [
    {
        "id": "cognicion",
        "label": "Cognición",
        "description": "El cerebro del Monstruo — donde piensa, aprende y recuerda",
        "color": "#3B82F6",
        "icon": "brain",
        "grid_origin": [0, 0],
        "grid_size": [5, 6],
    },
    {
        "id": "interfaces",
        "label": "Interfaces",
        "description": "Las formas en que el Monstruo se comunica con el mundo",
        "color": "#8B5CF6",
        "icon": "monitor",
        "grid_origin": [6, 0],
        "grid_size": [4, 5],
    },
    {
        "id": "infraestructura",
        "label": "Infraestructura",
        "description": "Los cimientos — servidores, bases de datos, seguridad",
        "color": "#10B981",
        "icon": "server",
        "grid_origin": [0, 7],
        "grid_size": [5, 5],
    },
    {
        "id": "capacidades",
        "label": "Capacidades",
        "description": "Lo que el Monstruo sabe hacer — sus habilidades activas",
        "color": "#F97316",
        "icon": "zap",
        "grid_origin": [6, 6],
        "grid_size": [4, 5],
    },
    {
        "id": "futuro",
        "label": "Futuro",
        "description": "Lo que viene — gaps por resolver y embriones por nacer",
        "color": "#6B7280",
        "icon": "compass",
        "grid_origin": [11, 0],
        "grid_size": [2, 12],
    },
]


def load_genome() -> dict[str, Any]:
    if not GENOME_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró el genoma en {GENOME_PATH}. "
            "El mount /mnt/desktop/el-monstruo/ no está disponible y "
            "no hay snapshot local."
        )
    with GENOME_PATH.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def slugify(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("(", "")
        .replace(")", "")
        .replace(",", "")
        .replace(".", "_")
        .replace("-", "_")
    )


def derive_loc(files_count: int, fallback: int = 200) -> int:
    """
    Estima líneas de código a partir del conteo de archivos del módulo.
    Esto es proxy mientras no haya métricas reales del repo.
    Fórmula: 200 LOC promedio por archivo Python, mínimo 80, máximo 3000.
    """
    if files_count <= 0:
        return fallback
    estimated = files_count * 200
    return max(80, min(3000, estimated))


def make_node(
    node_id: str,
    district: str,
    label: str,
    description: str,
    status: str,
    loc: int,
    last_updated: str,
    connections_in: list[str] | None = None,
    connections_out: list[str] | None = None,
    gap: str | None = None,
) -> dict[str, Any]:
    node = {
        "id": node_id,
        "district": district,
        "label": label,
        "description": description,
        "status": status,
        "loc": loc,
        "connections_in": connections_in or [],
        "connections_out": connections_out or [],
        "grid_position": [0, 0],  # se asigna después
        "last_updated": last_updated,
    }
    if gap:
        node["gap"] = gap
    return node


def project_kernel_modules(genome: dict[str, Any], today: str) -> list[dict[str, Any]]:
    """Mapea kernel.modules.* a nodos en los distritos correspondientes."""
    nodes: list[dict[str, Any]] = []
    kernel_modules = (genome.get("kernel", {}) or {}).get("modules", {}) or {}

    # Mapeo categoría del kernel → distrito del tablero
    category_to_district = {
        "core": "cognicion",
        "memory_systems": "cognicion",
        "intelligence": "cognicion",
        "interfaces": "interfaces",
        "governance": "capacidades",
        "product": "capacidades",
        "operational": "capacidades",
    }

    for category, modules in kernel_modules.items():
        district = category_to_district.get(category, "capacidades")
        for mod in modules or []:
            mod_id = mod.get("id")
            if not mod_id:
                continue
            files = int(mod.get("files", 0) or 0)
            label = mod_id.replace("_", " ").title()
            description = (
                f"Módulo {category.replace('_', ' ')} del kernel "
                f"({files} archivos en {mod.get('path', '?')})"
            )
            nodes.append(
                make_node(
                    node_id=mod_id,
                    district=district,
                    label=label,
                    description=description,
                    status="ACTIVE" if files > 0 else "FUTURE",
                    loc=derive_loc(files),
                    last_updated=today,
                )
            )
    return nodes


def project_embriones(genome: dict[str, Any], today: str) -> list[dict[str, Any]]:
    """Embriones del kernel — todos viven en distrito Capacidades."""
    nodes: list[dict[str, Any]] = []
    embriones = genome.get("embriones", {}) or {}

    # Orquestador y vigía (singleton)
    for key in ("orchestrator", "vigia"):
        emb = embriones.get(key) or {}
        emb_id = emb.get("id")
        if not emb_id:
            continue
        nodes.append(
            make_node(
                node_id=f"embrion_{emb_id}" if not emb_id.startswith("embrion_") else emb_id,
                district="capacidades",
                label=emb_id.replace("_", " ").title(),
                description=f"Embrión {key}: {emb.get('status', '?')}",
                status="ACTIVE" if emb.get("status") == "production" else "SPRINT",
                loc=derive_loc(1, fallback=600),
                last_updated=today,
            )
        )

    # Especialistas de dominio
    specialists = embriones.get("domain_specialists", []) or []
    for spec in specialists:
        spec_id = spec.get("id")
        if not spec_id:
            continue
        is_stateless = spec.get("memory") == "none"
        nodes.append(
            make_node(
                node_id=spec_id,
                district="capacidades",
                label=spec_id.replace("_", " ").title(),
                description=f"Especialista de dominio · {spec.get('path', '?')}",
                status="DEGRADED" if is_stateless else "ACTIVE",
                loc=derive_loc(1, fallback=300),
                last_updated=today,
                gap="Sin memoria — stateless" if is_stateless else None,
            )
        )

    return nodes


def project_satellites(genome: dict[str, Any], today: str) -> list[dict[str, Any]]:
    """Satélites como nodos de Interfaces o Futuro según su tipo y estado."""
    nodes: list[dict[str, Any]] = []
    satellites = genome.get("satellites", []) or []

    for sat in satellites:
        sat_id = sat.get("id")
        if not sat_id:
            continue
        sat_type = (sat.get("type") or "").lower()
        sat_status = (sat.get("status") or "").lower()

        # Decisión de distrito por tipo
        if sat_type in ("transport", "interface", "interface_visualization"):
            district = "interfaces"
        elif sat_type == "infrastructure":
            district = "infraestructura"
        elif sat_type == "product":
            district = "interfaces"  # el satélite producto es la cara visible
        elif sat_type in ("aspirant", "subsystem"):
            district = "futuro" if sat_status in ("in_development", "aspirant") else "infraestructura"
        else:
            district = "infraestructura"

        # Status del nodo
        if sat_status in ("active", "active_development", "active_unmapped", "active_with_drift", "active_drift_risk"):
            node_status = "ACTIVE"
        elif sat_status in ("offline",):
            node_status = "DEGRADED"
        elif sat_status in ("in_development", "aspirant"):
            node_status = "FUTURE"
        else:
            node_status = "ACTIVE"

        last_push = sat.get("last_push") or today
        # Normalizar a YYYY-MM-DD
        if isinstance(last_push, str) and len(last_push) >= 10:
            last_push = last_push[:10]
        else:
            last_push = today

        nodes.append(
            make_node(
                node_id=f"sat_{slugify(sat_id)}",
                district=district,
                label=sat_id.replace("-", " ").replace("_", " ").title(),
                description=sat.get("description", "Satélite del ecosistema Monstruo"),
                status=node_status,
                loc=derive_loc(5, fallback=400),
                last_updated=last_push,
                gap=sat.get("note"),
            )
        )

    return nodes


def project_infrastructure(genome: dict[str, Any], today: str) -> list[dict[str, Any]]:
    """Producción + memoria + base de datos como nodos de Infraestructura."""
    nodes: list[dict[str, Any]] = []
    production = genome.get("production", {}) or {}

    # Kernel deployado (Railway)
    kernel_prod = production.get("kernel", {}) or {}
    if kernel_prod:
        kernel_status = "ACTIVE" if kernel_prod.get("status") == "healthy" else "DEGRADED"
        nodes.append(
            make_node(
                node_id="kernel_production",
                district="infraestructura",
                label="Kernel Producción",
                description=f"FastAPI + LangGraph en Railway · {kernel_prod.get('version', '?')}",
                status=kernel_status,
                loc=derive_loc(0, fallback=2400),  # placeholder
                last_updated=today,
            )
        )

    # Supabase
    supabase = production.get("supabase", {}) or {}
    if supabase:
        nodes.append(
            make_node(
                node_id="supabase_main",
                district="infraestructura",
                label="Supabase",
                description=f"DB principal · {supabase.get('tables', 0)} tablas, {supabase.get('custom_rpcs', 0)} RPCs",
                status="ACTIVE",
                loc=derive_loc(0, fallback=1800),
                last_updated=today,
            )
        )

    # SMS — Sovereign Memory System
    memory_plane = genome.get("memory_plane", {}) or {}
    sms = memory_plane.get("sovereign_memory_system", {}) or {}
    if sms:
        nodes.append(
            make_node(
                node_id="sms_v4",
                district="infraestructura",
                label="Sovereign Memory v4",
                description=f"SMS · {len(sms.get('tables', []))} tablas soberanas, {len(sms.get('rpcs', []))} RPCs",
                status="ACTIVE",
                loc=derive_loc(0, fallback=1200),
                last_updated=today,
            )
        )

    # Bot
    bot = production.get("bot", {}) or {}
    if bot:
        bot_status = "ACTIVE" if bot.get("status") == "online" else "DEGRADED"
        nodes.append(
            make_node(
                node_id="bot_telegram",
                district="interfaces",
                label="Telegram Bot",
                description=bot.get("note", "Transporte T1 vía Railway"),
                status=bot_status,
                loc=derive_loc(0, fallback=300),
                last_updated=today,
                gap=bot.get("note") if bot_status == "DEGRADED" else None,
            )
        )

    return nodes


def project_gaps_as_future(genome: dict[str, Any], today: str) -> list[dict[str, Any]]:
    """Gaps críticos y moderados como nodos del distrito Futuro."""
    nodes: list[dict[str, Any]] = []
    gaps = genome.get("gaps", {}) or {}

    for severity in ("critical", "moderate"):
        for gap in (gaps.get(severity) or []):
            gap_id = gap.get("id")
            if not gap_id:
                continue
            nodes.append(
                make_node(
                    node_id=f"gap_{gap_id}",
                    district="futuro",
                    label=gap_id.replace("_", " ").title(),
                    description=gap.get("description", "Gap detectado"),
                    status="FUTURE",
                    loc=derive_loc(0, fallback=150),
                    last_updated=today,
                    gap=gap.get("fix") or gap.get("description"),
                )
            )

    return nodes


def assign_grid_positions(nodes: list[dict[str, Any]]) -> None:
    """Distribuye nodos en grid dentro de cada distrito."""
    by_district: dict[str, list[dict[str, Any]]] = {}
    for n in nodes:
        by_district.setdefault(n["district"], []).append(n)

    district_origins = {d["id"]: d["grid_origin"] for d in DISTRICTS_DEF}
    district_sizes = {d["id"]: d["grid_size"] for d in DISTRICTS_DEF}

    for district_id, district_nodes in by_district.items():
        # Orden estable por id para reproducibilidad
        district_nodes.sort(key=lambda n: n["id"])
        origin = district_origins.get(district_id, [0, 0])
        size = district_sizes.get(district_id, [5, 5])
        cols = max(1, size[0])
        for idx, node in enumerate(district_nodes):
            row = idx // cols
            col = idx % cols
            node["grid_position"] = [origin[0] + col, origin[1] + row]


def compute_system_health(nodes: list[dict[str, Any]]) -> float:
    if not nodes:
        return 0.0
    weights = {"ACTIVE": 1.0, "SPRINT": 0.7, "DEGRADED": 0.3, "FUTURE": 0.0}
    total = sum(weights.get(n["status"], 0.0) for n in nodes)
    return round(total / len(nodes), 3)


def compute_district_health(nodes: list[dict[str, Any]], district_id: str) -> float:
    in_district = [n for n in nodes if n["district"] == district_id]
    if not in_district:
        return 0.0
    weights = {"ACTIVE": 1.0, "SPRINT": 0.7, "DEGRADED": 0.3, "FUTURE": 0.0}
    total = sum(weights.get(n["status"], 0.0) for n in in_district)
    return round(total / len(in_district), 3)


def build() -> dict[str, Any]:
    genome = load_genome()
    today = datetime.now(timezone.utc).date().isoformat()

    nodes: list[dict[str, Any]] = []
    nodes.extend(project_kernel_modules(genome, today))
    nodes.extend(project_embriones(genome, today))
    nodes.extend(project_satellites(genome, today))
    nodes.extend(project_infrastructure(genome, today))
    nodes.extend(project_gaps_as_future(genome, today))

    # Dedup por id (algún módulo del kernel puede coincidir con embrión)
    seen: dict[str, dict[str, Any]] = {}
    for n in nodes:
        seen[n["id"]] = n  # último gana, lo cual es consistente porque embriones se proyectan después
    nodes = list(seen.values())

    # Asignar grid_position
    assign_grid_positions(nodes)

    # Calcular salud por distrito
    districts_with_health = []
    for d in DISTRICTS_DEF:
        node_count = sum(1 for n in nodes if n["district"] == d["id"])
        districts_with_health.append({
            **d,
            "health": compute_district_health(nodes, d["id"]),
            "node_count": node_count,
        })

    # Hash determinístico del payload (para detectar cambios)
    serialized = json.dumps(nodes, sort_keys=True)
    payload_sha = hashlib.sha256(serialized.encode()).hexdigest()[:16]

    return {
        "meta": {
            "generated_from": str(GENOME_PATH.name),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_mode": SOURCE_MODE,
            "source_path": str(GENOME_PATH),
            "source_commit": str((genome.get("meta", {}) or {}).get("generated_at", "unknown")),
            "version": "3.0.0",
            "total_nodes": len(nodes),
            "system_health": compute_system_health(nodes),
            "payload_sha": payload_sha,
        },
        "districts": districts_with_health,
        "nodes": nodes,
    }


def main() -> int:
    print(f"[board] Modo de fuente: {SOURCE_MODE}")
    print(f"[board] Leyendo genoma: {GENOME_PATH}")
    payload = build()
    OUT_SRC.parent.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)

    serialized = json.dumps(payload, indent=2, ensure_ascii=False)
    OUT_SRC.write_text(serialized, encoding="utf-8")
    OUT_PUBLIC.write_text(serialized, encoding="utf-8")

    meta = payload["meta"]
    print(f"[board] Total: {meta['total_nodes']} nodos")
    print(f"[board] Salud del sistema: {meta['system_health']}")
    print(f"[board] SHA payload: {meta['payload_sha']}")
    for d in payload["districts"]:
        print(f"  - {d['label']}: {d['node_count']} nodos · salud {d['health']}")
    print(f"[board] Escrito en: {OUT_SRC.relative_to(ROOT)}")
    print(f"[board] Espejo en:  {OUT_PUBLIC.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
