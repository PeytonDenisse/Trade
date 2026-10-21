// Creates the Trade collections in MongoDB (definitions in db/collections.ts).
// Safe to run more than once. Run: pnpm db:setup
// Optionally copy rows from a SQLite file: pnpm db:setup --import path/to/file.sqlite
import { MongoClient } from "mongodb";
import { collections, ensureCollections } from "../db/collections.ts";

async function importSqlite(db, file) {
  const { DatabaseSync } = await import("node:sqlite");
  const sql = new DatabaseSync(file, { readOnly: true });
  for (const [name, { key }] of Object.entries(collections)) {
    const rows = sql.prepare(`SELECT * FROM "${name}"`).all().map((r) => ({ ...r }));
    if (rows.length) {
      await db.collection(name).bulkWrite(
        rows.map((r) => ({ replaceOne: { filter: { [key]: r[key] }, replacement: r, upsert: true } }))
      );
    }
    console.log(`imported ${rows.length} rows into ${name}`);
  }
  sql.close();
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const importFrom = process.argv.includes("--import") ? process.argv[process.argv.indexOf("--import") + 1] : null;

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  const db = client.db(process.env.MONGODB_DB || "trade");
  await ensureCollections(db, console.log);
  if (importFrom) await importSqlite(db, importFrom);
} catch (err) {
  console.error("Setup failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
