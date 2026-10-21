import type { Db } from "mongodb";

// MongoDB collections mirroring the original SQL tables (see drizzle/ migrations).
const str = { bsonType: "string" };
const optStr = { bsonType: ["string", "null"] };
const num = { bsonType: "number" };

type Def = { key: string; fields: Record<string, object>; optional?: string[]; unique?: Record<string, 1>[]; index?: Record<string, 1>[] };

// key: the SQL primary key; unique: extra unique indexes; index: lookup indexes for foreign keys.
export const collections: Record<string, Def> = {
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

function validator({ fields, optional = [] }: Def) {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: Object.keys(fields).filter((f) => !optional.includes(f)),
      properties: { _id: {}, ...fields },
      additionalProperties: false,
    },
  };
}

// Creates or updates every collection with its validator and indexes. Safe to run repeatedly.
export async function ensureCollections(db: Db, log: (msg: string) => void = () => {}) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, def] of Object.entries(collections)) {
    if (existing.has(name)) await db.command({ collMod: name, validator: validator(def) });
    else await db.createCollection(name, { validator: validator(def) });
    const coll = db.collection(name);
    await coll.createIndex({ [def.key]: 1 }, { unique: true });
    for (const keys of def.unique ?? []) await coll.createIndex(keys, { unique: true });
    for (const keys of def.index ?? []) await coll.createIndex(keys);
    log(`${existing.has(name) ? "updated" : "created"} ${name}`);
  }
}
