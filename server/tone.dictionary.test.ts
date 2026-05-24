/**
 * Sprint v3.0 / T3 — Tests del diccionario Modo Papá.
 *
 * Estos tests fallan a propósito si:
 * - Algún status enum (ACTIVE/DEGRADED/SPRINT/FUTURE) deja de tener traducción.
 * - Algún distrito canónico de la doctrina pierde su entrada.
 * - La cobertura de NODE_LABEL_PAPA contra los IDs reales del genoma del
 *   Monstruo cae por debajo de un umbral mínimo (drift detection).
 * - Los buckets cualitativos de LOC se rompen.
 *
 * Validan que Modo Papá sea funcional (traduce de verdad), no cosmético.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  translateLabel,
  translateStatus,
  translateStatusDescription,
  translateDistrict,
  humanizeMetric,
  humanizeKernelTerm,
  dictionaryCoverage,
  NODE_LABEL_PAPA,
  STATUS_LABEL_PAPA,
  STATUS_LABEL_DEFAULT,
  DISTRICT_LABEL_PAPA,
} from "../client/src/lib/tone";

describe("tone — status enum", () => {
  it("traduce los 4 status canónicos en modo papa", () => {
    expect(translateStatus("ACTIVE", "papa")).toBe("Funcionando");
    expect(translateStatus("DEGRADED", "papa")).toBe("Con problemas");
    expect(translateStatus("SPRINT", "papa")).toBe("En obra");
    expect(translateStatus("FUTURE", "papa")).toBe("Por hacer");
  });

  it("preserva etiquetas técnicas en modo default", () => {
    expect(translateStatus("ACTIVE", "default")).toBe("Activa");
    expect(translateStatus("DEGRADED", "default")).toBe("Degradada");
    expect(translateStatus("SPRINT", "default")).toBe("En construcción");
    expect(translateStatus("FUTURE", "default")).toBe("Futura");
  });

  it("status enum cubierto al 100% en ambos diccionarios", () => {
    const enumValues = ["ACTIVE", "DEGRADED", "SPRINT", "FUTURE"];
    for (const v of enumValues) {
      expect(STATUS_LABEL_PAPA[v]).toBeDefined();
      expect(STATUS_LABEL_DEFAULT[v]).toBeDefined();
    }
  });

  it("descripciones de status no quedan vacías en modo papa", () => {
    for (const v of ["ACTIVE", "DEGRADED", "SPRINT", "FUTURE"]) {
      const desc = translateStatusDescription(v, "papa");
      expect(desc.length).toBeGreaterThan(10);
    }
  });
});

describe("tone — distritos", () => {
  it("traduce los 5 distritos canónicos", () => {
    expect(translateDistrict("cognicion", "Cognición", "papa")).toBe(
      "Cómo piensa",
    );
    expect(translateDistrict("interfaces", "Interfaces", "papa")).toBe(
      "Por dónde habla",
    );
    expect(translateDistrict("infraestructura", "Infra", "papa")).toBe(
      "Dónde vive",
    );
    expect(translateDistrict("capacidades", "Capacidades", "papa")).toBe(
      "Qué sabe hacer",
    );
    expect(translateDistrict("futuro", "Futuro", "papa")).toBe("Lo que viene");
  });

  it("preserva fallback en modo default", () => {
    expect(translateDistrict("cognicion", "Cognición", "default")).toBe(
      "Cognición",
    );
  });

  it("distrito desconocido cae al fallback en modo papa", () => {
    expect(translateDistrict("zzzzz", "Fallback Label", "papa")).toBe(
      "Fallback Label",
    );
  });

  it("cubre los 5 distritos en DISTRICT_LABEL_PAPA", () => {
    const expected = [
      "cognicion",
      "interfaces",
      "infraestructura",
      "capacidades",
      "futuro",
    ];
    for (const d of expected) {
      expect(DISTRICT_LABEL_PAPA[d]).toBeDefined();
      expect(DISTRICT_LABEL_PAPA[d].length).toBeGreaterThan(2);
    }
  });
});

describe("tone — labels de nodos", () => {
  it("traduce nodos canónicos del Monstruo", () => {
    expect(translateLabel("embrion_loop", "Embrion Loop", "papa")).toBe(
      "Cómo piensa",
    );
    expect(translateLabel("bot_telegram", "Telegram Bot", "papa")).toMatch(
      /Telegram/,
    );
    expect(translateLabel("supabase_main", "Supabase", "papa")).toBe(
      "Su memoria de largo plazo",
    );
    expect(translateLabel("memento", "Memento", "papa")).toMatch(/libreta/);
  });

  it("preserva label técnico en modo default", () => {
    expect(translateLabel("embrion_loop", "Embrion Loop", "default")).toBe(
      "Embrion Loop",
    );
  });

  it("nodo no presente en diccionario cae al fallback", () => {
    expect(translateLabel("zzz_inexistente", "Fallback X", "papa")).toBe(
      "Fallback X",
    );
  });

  it("diccionario tiene al menos 30 entradas (mínimo de cobertura útil)", () => {
    expect(Object.keys(NODE_LABEL_PAPA).length).toBeGreaterThanOrEqual(30);
  });
});

describe("tone — humanizeMetric (LOC)", () => {
  it("modo default devuelve líneas con separador de miles", () => {
    expect(humanizeMetric("loc", 1234, "default")).toEqual({
      value: "1,234",
      unit: "líneas",
    });
  });

  it("modo papa convierte LOC a buckets cualitativos", () => {
    expect(humanizeMetric("loc", 0, "papa").value).toBe("—");
    expect(humanizeMetric("loc", 150, "papa").value).toBe("Chiquita");
    expect(humanizeMetric("loc", 800, "papa").value).toBe("Mediana");
    expect(humanizeMetric("loc", 3000, "papa").value).toBe("Grande");
    expect(humanizeMetric("loc", 12000, "papa").value).toBe("Enorme");
  });

  it("modo papa nunca devuelve la palabra 'líneas'", () => {
    for (const v of [0, 50, 150, 800, 3000, 12000]) {
      const r = humanizeMetric("loc", v, "papa");
      expect(r.unit).not.toContain("líneas");
    }
  });
});

describe("tone — humanizeKernelTerm", () => {
  it("traduce jerga del kernel a lenguaje humano", () => {
    expect(humanizeKernelTerm("kernel", "papa")).toBe("cerebro");
    expect(humanizeKernelTerm("supabase", "papa")).toBe("memoria");
    expect(humanizeKernelTerm("deploy", "papa")).toBe("publicación");
    expect(humanizeKernelTerm("uptime", "papa")).toBe("tiempo encendido");
    expect(humanizeKernelTerm("api", "papa")).toBe("puerta de entrada");
  });

  it("preserva término técnico en modo default", () => {
    expect(humanizeKernelTerm("kernel", "default")).toBe("kernel");
    expect(humanizeKernelTerm("supabase", "default")).toBe("supabase");
  });

  it("es case-insensitive", () => {
    expect(humanizeKernelTerm("Kernel", "papa")).toBe("cerebro");
    expect(humanizeKernelTerm("SUPABASE", "papa")).toBe("memoria");
  });

  it("término desconocido se devuelve sin cambios", () => {
    expect(humanizeKernelTerm("zorglubble", "papa")).toBe("zorglubble");
  });
});

describe("tone — drift detection vs genoma vivo", () => {
  // Lee el board snapshot generado por build_board_data.py contra el genoma
  // canónico del Monstruo y verifica que la cobertura del diccionario no
  // cae bajo umbral. Si añades nodos al genoma sin traducirlos, este test
  // te lo grita.
  it("cobertura del diccionario sobre el genoma actual ≥ 40%", () => {
    const snapshotPath = join(
      process.cwd(),
      "client",
      "src",
      "data",
      "board_data.json",
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    const ids: string[] = (snapshot.nodes ?? []).map(
      (n: { id: string }) => n.id,
    );
    expect(ids.length).toBeGreaterThan(20);

    const cov = dictionaryCoverage(ids);
    // Umbral mínimo: 40%. La meta es 70%+, pero permitimos slack porque
    // el genoma evoluciona más rápido que el diccionario y queremos
    // detectar drift sin bloquear builds legítimos.
    expect(cov.ratio).toBeGreaterThanOrEqual(0.4);
  });

  it("los nodos cardinales del genoma están traducidos", () => {
    // Si alguno de estos pierde traducción, es regresión grave.
    const cardinales = [
      "kernel_production",
      "supabase_main",
      "bot_telegram",
      "memento",
      "catastro",
      "embrion_loop",
      "sms_v4",
    ];
    for (const id of cardinales) {
      expect(NODE_LABEL_PAPA[id]).toBeDefined();
      expect(NODE_LABEL_PAPA[id].length).toBeGreaterThan(3);
    }
  });
});
