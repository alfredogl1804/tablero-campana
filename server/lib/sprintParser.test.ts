import { describe, expect, it } from "vitest";
import {
  filenameToSprintId,
  normalizeStatus,
  parseSprintFile,
} from "./sprintParser";

describe("filenameToSprintId", () => {
  it("strips .md and lowercases", () => {
    expect(filenameToSprintId("Sprint_88_Cierre.md")).toBe("sprint_88_cierre");
  });

  it("collapses non-alphanumerics to underscore", () => {
    expect(filenameToSprintId("sprint!@# 90.md")).toBe("sprint_90");
  });

  it("keeps existing dots and dashes", () => {
    expect(filenameToSprintId("SPR-NIGHTLY-001.md")).toBe("spr-nightly-001");
  });
});

describe("normalizeStatus", () => {
  it("maps Propuesto to draft", () => {
    expect(normalizeStatus("Propuesto")).toBe("draft");
  });

  it("maps Firmado to signed", () => {
    expect(normalizeStatus("Firmado por Alfredo")).toBe("signed");
  });

  it("maps En curso to executing", () => {
    expect(normalizeStatus("En curso")).toBe("executing");
  });

  it("maps Completado to completed", () => {
    expect(normalizeStatus("Completado")).toBe("completed");
  });

  it("returns unknown for nonsense", () => {
    expect(normalizeStatus("zzz")).toBe("unknown");
  });

  it("returns unknown for null", () => {
    expect(normalizeStatus(null)).toBe("unknown");
  });
});

describe("parseSprintFile", () => {
  it("returns null for README", () => {
    expect(parseSprintFile("README.md", "# Index")).toBeNull();
  });

  it("returns null for _INDEX", () => {
    expect(parseSprintFile("_INDEX.md", "# Hello")).toBeNull();
  });

  it("returns null for non-sprint titles", () => {
    expect(
      parseSprintFile("notes.md", "# Notes about something\nbody"),
    ).toBeNull();
  });

  it("parses a canonical sprint header", () => {
    const content = `# Sprint 88 — Cierre v1.0 PRODUCTO

**Estado:** Propuesto
**Hilo:** Manus

Body content here. Mentions LLM and TiDB.
`;
    const parsed = parseSprintFile("sprint_88_cierre.md", content);
    expect(parsed).not.toBeNull();
    expect(parsed?.sprintId).toBe("sprint_88_cierre");
    expect(parsed?.title).toMatch(/Sprint 88/);
    expect(parsed?.status).toBe("draft");
    expect(parsed?.signedBy).toBe("Manus");
    // Should infer at least one district from LLM/TiDB keywords.
    expect(parsed?.affectedDistricts.length).toBeGreaterThan(0);
  });

  it("infers cognicion district from LLM keywords", () => {
    const content = `# Sprint LLM Migration

**Estado:** Firmado

Sprint para migrar el modelo LLM a uno mejor.`;
    const parsed = parseSprintFile("sprint_llm.md", content);
    expect(parsed?.affectedDistricts).toContain("cognicion");
    expect(parsed?.status).toBe("signed");
  });

  it("falls back to operaciones when no keyword matches", () => {
    const content = `# Sprint Cualquiera

**Estado:** Propuesto

Sin keywords obvios.`;
    const parsed = parseSprintFile("sprint_x.md", content);
    expect(parsed?.affectedDistricts).toEqual(["operaciones"]);
  });

  it("computes deterministic hashCanonical", () => {
    const content = `# Sprint Test\n\n**Estado:** Propuesto\n\nbody`;
    const a = parseSprintFile("sprint_test.md", content);
    const b = parseSprintFile("sprint_test.md", content);
    expect(a?.hashCanonical).toBe(b?.hashCanonical);
    expect(a?.hashCanonical).toHaveLength(64);
  });

  it("hash differs when content changes", () => {
    const a = parseSprintFile(
      "sprint_a.md",
      "# Sprint A\n**Estado:** Propuesto\nfoo",
    );
    const b = parseSprintFile(
      "sprint_a.md",
      "# Sprint A\n**Estado:** Propuesto\nbar",
    );
    expect(a?.hashCanonical).not.toBe(b?.hashCanonical);
  });
});
