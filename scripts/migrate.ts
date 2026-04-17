import postgres from "postgres";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local manually
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL no está configurada en .env.local");
    process.exit(1);
  }

  console.log("🔌 Conectando a la base de datos...");
  const sql = postgres(databaseUrl, { ssl: "require" });

  try {
    await sql`SELECT 1`;
    console.log("✅ Conectado");
  } catch (err) {
    console.error("❌ No se pudo conectar:", (err as Error).message);
    process.exit(1);
  }

  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Read migration files
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const executed = await sql`SELECT name FROM _migrations`;
  const executedNames = new Set(executed.map((r) => r.name));

  let ran = 0;

  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`⏭️  ${file} (ya ejecutada)`);
      continue;
    }

    const content = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`🚀 Ejecutando ${file}...`);

    try {
      await sql.unsafe(content);
      await sql`INSERT INTO _migrations (name) VALUES (${file})`;
      console.log(`✅ ${file}`);
      ran++;
    } catch (err) {
      console.error(`❌ Error en ${file}:`, (err as Error).message);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log("\n✅ Base de datos al día — no hay migraciones pendientes.");
  } else {
    console.log(`\n✅ ${ran} migración(es) ejecutada(s) correctamente.`);
  }

  await sql.end();
}

migrate();
