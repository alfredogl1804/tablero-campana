#!/usr/bin/env python3
"""
Pipeline canónico de generación cero-drift del Catastro Visual Ledger.

Origen único de verdad:
  - kernel/catastro/data/catastro_agentes.json
  - kernel/catastro/data/catastro_tools.json
  - kernel/catastro/data/catastro_suppliers.json

Salida:
  - client/public/data/catastro_visual_ledger.json
  - client/src/data/catastro_visual_ledger.json (copia espejo para import directo)

Reglas (DSC-G-008 cero drift):
  1. Lectura lossless de los 3 JSONs reales.
  2. Prefijo de IDs (agt_, tool_, sup_) para evitar colisiones.
  3. Inyección sintética de Nano Banana Pro como TOOL operable hasta que
     el catastro real lo registre. Marcado con synthetic=True para auditoría.
  4. Asignación isométrica de grid_position por distrito y categoría.
  5. Naming canónico DSC-S-007 (no se generan secrets aquí, pero se respeta).

Uso:
  python3 scripts/build_visual_ledger.py
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent

# Fuente canónica: el repo real montado en el sandbox vía FUSE.
# Si está disponible, leemos de ahí (cero drift). Si no (CI o máquinas
# sin el mount), caemos a la copia local en scripts/catastro_sources/
# que solo sirve como snapshot de respaldo.
CANONICAL = Path("/mnt/desktop/el-monstruo/kernel/catastro/data")
LOCAL_SNAPSHOT = ROOT / "scripts" / "catastro_sources"

if CANONICAL.is_dir() and (CANONICAL / "catastro_agentes.json").exists():
    SOURCES = CANONICAL
    SOURCE_MODE = "canonical_mount"
else:
    SOURCES = LOCAL_SNAPSHOT
    SOURCE_MODE = "local_snapshot_fallback"

OUT_PUBLIC = ROOT / "client" / "public" / "data" / "catastro_visual_ledger.json"
OUT_SRC = ROOT / "client" / "src" / "data" / "catastro_visual_ledger.json"

# Distritos del CatastroCluster (no confundir con los 5 del Tablero principal)
DISTRICT_DEFINITIONS = {
    "AGENTES": {
        "label": "Agentes",
        "subtitle": "Entidades cognitivas con autonomía parcial",
        "color": "#FF7A1A",  # naranja forja
        "grid_origin": [0, 0],
    },
    "TOOLS": {
        "label": "Herramientas",
        "subtitle": "Capacidades ejecutables sin voluntad propia",
        "color": "#4FC3F7",  # azul tool
        "grid_origin": [12, 0],
    },
    "SUPPLIERS": {
        "label": "Proveedores",
        "subtitle": "Infraestructura, motores y aliados externos",
        "color": "#9CCC65",  # verde supplier
        "grid_origin": [24, 0],
    },
}

# Inyección sintética: Nano Banana Pro es la única operable hoy desde el HUD
# pero NO existe como entry en catastro_tools.json todavía. Se inyecta con
# synthetic=True hasta que el repo del catastro la registre formalmente.
SYNTHETIC_NODES: list[dict[str, Any]] = [
    {
        "id": "nano_banana_pro",
        "nombre": "Nano Banana Pro",
        "categoria": "image_generation",
        "proveedor": "Google DeepMind",
        "diferenciador": (
            "Generación y edición de imágenes con calidad profesional vía Gemini "
            "3 Pro Image Preview — la única candidata operable hoy desde el HUD."
        ),
        "url": "https://ai.google.dev/gemini-api/docs/image-generation",
        "madurez": "production_ready",
        "estado": "vigente_2026",
        "is_operable": True,
        "synthetic": True,
    }
]


def slugify(value: str) -> str:
    """Slug seguro y reversible (kebab/snake compatibles)."""
    return (
        value.strip()
        .lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("(", "")
        .replace(")", "")
        .replace(",", "")
    )


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize_agente(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"agt_{entry['id']}",
        "name": entry["nombre"],
        "entity_type": "AGENTE",
        "category": entry["categoria"],
        "status": entry.get("estado", "vigente_2026"),
        "is_operable": False,
        "provider": entry.get("proveedor"),
        "version": entry.get("version"),
        "description": entry.get("diferenciador_unico", ""),
        "lessons": entry.get("lecciones_para_monstruo"),
        "interfaces": entry.get("interfaces", []),
        "auth_pattern": entry.get("auth_pattern"),
        "biblia_path": entry.get("biblia_path"),
        "biblia_size_bytes": entry.get("biblia_size_bytes"),
        "synthetic": False,
    }


def normalize_tool(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"tool_{entry['id']}",
        "name": entry["nombre"],
        "entity_type": "TOOL",
        "category": entry["categoria"],
        "status": entry.get("estado", "vigente_2026"),
        "is_operable": entry.get("is_operable", False),
        "provider": entry.get("proveedor"),
        "url": entry.get("url"),
        "pricing": entry.get("precio"),
        "description": entry.get("diferenciador", ""),
        "api_available": entry.get("api"),
        "maturity": entry.get("madurez"),
        "oss_alternatives": entry.get("alternativas_oss", []),
        "synthetic": entry.get("synthetic", False),
    }


def normalize_supplier(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"sup_{entry['id']}",
        "name": entry["nombre_legal"],
        "entity_type": "SUPPLIER",
        "category": entry["categoria"],
        "status": "vigente_2026",
        "is_operable": False,
        "city": entry.get("ciudad"),
        "address": entry.get("direccion"),
        "url": entry.get("web"),
        "phone": entry.get("telefono"),
        "email": entry.get("email"),
        "description": entry.get("especialidad", ""),
        "representative_cases": entry.get("casos_representativos"),
        "synthetic": False,
    }


def assign_grid_positions(nodes: list[dict[str, Any]]) -> None:
    """
    Asigna grid_position [x, z] para cada nodo dentro de su distrito.
    Cada distrito ocupa una banda de 10 columnas. Dentro de una banda los
    nodos se acomodan en una grilla cuadrada de 10x10 ordenados por categoría
    para formar 'manzanas' espaciales por familia.
    """
    by_district: dict[str, list[dict[str, Any]]] = {}
    for node in nodes:
        by_district.setdefault(node["entity_type"], []).append(node)

    for district_key, district_nodes in by_district.items():
        # Orden estable: por categoría, luego por nombre
        district_nodes.sort(key=lambda n: (n["category"], n["name"]))

        origin_x, origin_z = DISTRICT_DEFINITIONS[
            district_key + "S" if not district_key.endswith("S") else district_key
        ]["grid_origin"] if (district_key + "S") in DISTRICT_DEFINITIONS else (
            DISTRICT_DEFINITIONS[district_key]["grid_origin"]
        )

        cols = 10  # ancho de banda
        for idx, node in enumerate(district_nodes):
            row = idx // cols
            col = idx % cols
            node["grid_position"] = [origin_x + col, origin_z + row]


def build_ledger() -> dict[str, Any]:
    agentes_raw = load_json(SOURCES / "catastro_agentes.json")
    tools_raw = load_json(SOURCES / "catastro_tools.json")
    suppliers_raw = load_json(SOURCES / "catastro_suppliers.json")

    nodes: list[dict[str, Any]] = []

    for entry in agentes_raw["entries"]:
        nodes.append(normalize_agente(entry))

    for entry in tools_raw["entries"]:
        nodes.append(normalize_tool(entry))

    # Inyección de nodos sintéticos (auditados con synthetic=True)
    for synth in SYNTHETIC_NODES:
        nodes.append(normalize_tool(synth))

    for entry in suppliers_raw["entries"]:
        nodes.append(normalize_supplier(entry))

    # Posicionamiento isométrico
    assign_grid_positions(nodes)

    # Construir índice de categorías reales
    categories: dict[str, dict[str, Any]] = {}
    for node in nodes:
        key = f"{node['entity_type']}::{node['category']}"
        if key not in categories:
            categories[key] = {
                "key": key,
                "entity_type": node["entity_type"],
                "category": node["category"],
                "count": 0,
            }
        categories[key]["count"] += 1

    operable_nodes = [n for n in nodes if n.get("is_operable")]

    ledger = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_by": "scripts/build_visual_ledger.py",
            "source_mode": SOURCE_MODE,
            "source_files": [
                str(SOURCES / "catastro_agentes.json"),
                str(SOURCES / "catastro_tools.json"),
                str(SOURCES / "catastro_suppliers.json"),
            ],
            "total_nodes": len(nodes),
            "total_agentes": sum(1 for n in nodes if n["entity_type"] == "AGENTE"),
            "total_tools": sum(1 for n in nodes if n["entity_type"] == "TOOL"),
            "total_suppliers": sum(1 for n in nodes if n["entity_type"] == "SUPPLIER"),
            "operable_count": len(operable_nodes),
            "synthetic_count": sum(1 for n in nodes if n.get("synthetic")),
            "policy": "DSC-G-008 cero drift — fuente única de verdad",
            "version": "1.0.0",
        },
        "districts": [
            {
                "key": key,
                **defn,
            }
            for key, defn in DISTRICT_DEFINITIONS.items()
        ],
        "categories": sorted(categories.values(), key=lambda c: (c["entity_type"], c["category"])),
        "nodes": nodes,
    }

    return ledger


def main() -> int:
    print(f"[ledger] Modo de fuente: {SOURCE_MODE}")
    print(f"[ledger] Construyendo desde: {SOURCES}")
    ledger = build_ledger()

    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUT_SRC.parent.mkdir(parents=True, exist_ok=True)

    payload = json.dumps(ledger, indent=2, ensure_ascii=False)
    OUT_PUBLIC.write_text(payload, encoding="utf-8")
    OUT_SRC.write_text(payload, encoding="utf-8")

    meta = ledger["metadata"]
    print(f"[ledger] Total: {meta['total_nodes']} nodos")
    print(
        f"  - Agentes: {meta['total_agentes']} | "
        f"Tools: {meta['total_tools']} | "
        f"Suppliers: {meta['total_suppliers']}"
    )
    print(f"  - Operables: {meta['operable_count']} | Sintéticos: {meta['synthetic_count']}")
    print(f"[ledger] Escrito en: {OUT_PUBLIC.relative_to(ROOT)}")
    print(f"[ledger] Espejo en:  {OUT_SRC.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
