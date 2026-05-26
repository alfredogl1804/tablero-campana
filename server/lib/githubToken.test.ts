import { describe, it, expect } from "vitest";

/**
 * Valida que GITHUB_TOKEN está presente y autentica correctamente con la
 * API de GitHub. Sin esto, el pinger no puede refrescar el catálogo del
 * ecosistema y los proyectos aparecen como `unknown`.
 *
 * No asumimos visibility (público/privado) — eso lo audita la app contra
 * el catálogo. Solo validamos: token válido + lectura básica.
 */
describe("GITHUB_TOKEN secret validation", () => {
  it("token is set in environment", () => {
    const token = process.env.GITHUB_TOKEN;
    expect(token).toBeTruthy();
    // gh tokens empiezan con gho_ o ghp_ o ghs_ o github_pat_
    expect(token!.length).toBeGreaterThan(20);
  });

  it("token authenticates with /user endpoint", async () => {
    const token = process.env.GITHUB_TOKEN;
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "tablero-campana-test/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as { login?: string };
    expect(data.login).toBeTruthy();
  }, 15_000);

  it("can read pushed_at for ecosystem repo (tablero-campana)", async () => {
    const token = process.env.GITHUB_TOKEN;
    const resp = await fetch(
      "https://api.github.com/repos/alfredogl1804/tablero-campana",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "tablero-campana-test/1.0",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as { pushed_at?: string };
    expect(data.pushed_at).toBeTruthy();
    expect(new Date(data.pushed_at!).getTime()).toBeGreaterThan(0);
  }, 15_000);

  it("can list user repos with full visibility", async () => {
    const token = process.env.GITHUB_TOKEN;
    const resp = await fetch(
      "https://api.github.com/user/repos?per_page=5&sort=pushed",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "tablero-campana-test/1.0",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as Array<{ name: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  }, 15_000);
});
