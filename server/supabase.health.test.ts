import { describe, expect, it } from "vitest";

/**
 * Validates SUPABASE_SERVICE_KEY by hitting the live PostgREST introspection
 * endpoint. The OpenAPI spec at the root of PostgREST returns the schema of
 * all tables visible to the calling role — when called with the service_role
 * key, this lists every table in the project (182 expected on the Monstruo).
 */
describe("supabase.health (live)", () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  it("environment variables are present and well-formed", () => {
    expect(url, "SUPABASE_URL not set").toBeTruthy();
    expect(key, "SUPABASE_SERVICE_KEY not set").toBeTruthy();
    expect(url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    // Canonical naming DSC-S-007: must be sb_secret_* not the legacy JWT format.
    expect(key, "Key must be canonical sb_secret_* per DSC-S-007").toMatch(
      /^sb_secret_/,
    );
  });

  it("PostgREST root responds and returns a non-empty table inventory", async () => {
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL/SUPABASE_SERVICE_KEY");
    }

    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/openapi+json",
      },
    });

    expect(res.ok, `PostgREST returned ${res.status}`).toBe(true);

    const spec = (await res.json()) as { definitions?: Record<string, unknown> };
    const tableCount = Object.keys(spec.definitions ?? {}).length;

    // Genome v0.8 inventory documented 182 tables. We assert > 50 to allow for
    // schema drift while still confirming the key has read access.
    expect(tableCount).toBeGreaterThan(50);
  }, 15_000);
});
