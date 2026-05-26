/**
 * Seed script — pobla `connected_projects` con el catálogo curado del
 * ecosistema. Idempotente (UPSERT por project_id).
 *
 * Hito C — Sprint Observatorio Vivo v1.1.
 */

import { getDb } from "../server/db";
import { connectedProjects } from "../drizzle/schema";
import { ECOSYSTEM_CATALOG } from "../server/lib/projectsCatalog";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  console.log(`[seed] Insertando/actualizando ${ECOSYSTEM_CATALOG.length} proyectos...`);

  let inserted = 0;
  let updated = 0;

  for (const proj of ECOSYSTEM_CATALOG) {
    // UPSERT con on duplicate key update
    const result = await db
      .insert(connectedProjects)
      .values(proj)
      .onDuplicateKeyUpdate({
        set: {
          displayName: proj.displayName,
          description: proj.description,
          category: proj.category,
          district: proj.district,
          githubOwner: proj.githubOwner,
          githubRepo: proj.githubRepo,
          githubVisibility: proj.githubVisibility,
          deployTarget: proj.deployTarget,
          deployUrl: proj.deployUrl,
          stackTags: proj.stackTags,
          status: proj.status,
          starX: proj.starX,
          starY: proj.starY,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });

    // mysql2 returns affectedRows: 1 = insert, 2 = update
    const affected = (result as unknown as [{ affectedRows?: number }])[0]
      ?.affectedRows;
    if (affected === 1) inserted++;
    else if (affected === 2) updated++;
  }

  console.log(`[seed] inserted=${inserted}, updated=${updated}`);

  // Verificación
  const all = await db.select().from(connectedProjects);
  console.log(`[seed] total en DB: ${all.length}`);
  console.log(`[seed] por categoría:`);
  const byCat = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(byCat);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
