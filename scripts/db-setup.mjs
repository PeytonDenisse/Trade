// Creates the Trade collections in MongoDB, mirroring the SQL tables in db/schema.ts.
// Safe to run more than once. Run: pnpm db:setup
// Optionally copy rows from a SQLite file: pnpm db:setup --import path/to/file.sqlite
import { MongoClient } from "mongodb";

const str = { bsonType: "string" };
const optStr = { bsonType: ["string", "null"] };
const num = { bsonType: "number" };

// key: the SQL primary key; unique: extra unique indexes; index: lookup indexes for foreign keys.
export const collections = {
  users: {
    key: "id",
    fields: { id: str, name: str, email: str, hash: str, salt: str, role: str },
    unique: [{ email: 1 }],
  },
  sessions: {
    key: "token",
    fields: { token: str, user_id: str, expires: num },
    index: [{ user_id: 1 }, { expires: 1 }],
  },
  providers: {
    key: "id",
    fields: { id: str, trade: str, experience: str, zone: str, description: str, photo: str, document: str, status: str },
    index: [{ trade: 1, status: 1 }],
  },
  requests: {
    key: "id",
    fields: { id: str, owner: str, trade: str, description: str, date: str, status: str, provider: optStr, quote: optStr, created: str },
    optional: ["provider", "quote"],
    index: [{ owner: 1 }, { provider: 1 }, { trade: 1, status: 1 }],
  },
  quotes: {
    key: "id",
    fields: { id: str, request: str, provider: str, price: num, description: str, status: str },
    unique: [{ request: 1, provider: 1 }],
  },
  files: {
    key: "id",
    fields: { id: str, owner: str, request: optStr, kind: str, mime: str },
    optional: ["request"],
    index: [{ owner: 1 }, { request: 1 }],
  },
  reviews: {
    key: "request",
    fields: { request: str, provider: str, owner: str, stars: { bsonType: ["int", "null"], minimum: 1, maximum: 5 }, comment: optStr },
    optional: ["stars", "comment"],
    index: [{ provider: 1 }],
  },
};

function validator({ fields, optional = [] }) {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: Object.keys(fields).filter((f) => !optional.includes(f)),
      properties: { _id: {}, ...fields },
      additionalProperties: false,
    },
  };
}

async function setup(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, def] of Object.entries(collections)) {
    if (existing.has(name)) await db.command({ collMod: name, validator: validator(def) });
    else await db.createCollection(name, { validator: validator(def) });
    const coll = db.collection(name);
    await coll.createIndex({ [def.key]: 1 }, { unique: true });
    for (const keys of def.unique ?? []) await coll.createIndex(keys, { unique: true });
    for (const keys of def.index ?? []) await coll.createIndex(keys);
    console.log(`${existing.has(name) ? "updated" : "created"} ${name}`);
  }
}

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
  await setup(db);
  if (importFrom) await importSqlite(db, importFrom);
} catch (err) {
  console.error("Setup failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
