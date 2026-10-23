import type { Db } from "mongodb";

// MongoDB collections mirroring the original SQL tables (see drizzle/ migrations).
const str = { bsonType: "string" };
const optStr = { bsonType: ["string", "null"] };
const num = { bsonType: "number" };
// active is required on users and providers: true unless an admin deactivated the record.
const bool = { bsonType: "bool" };

type Def = { key: string; fields: Record<string, object>; optional?: string[]; unique?: Record<string, 1>[]; index?: Record<string, 1>[] };

// key: the SQL primary key; unique: extra unique indexes; index: lookup indexes for foreign keys.
export const collections: Record<string, Def> = {
  users: {
    key: "id",
    // photo: avatar file id; created_at: ISO date of registration (older accounts have none).
    fields: { id: str, name: str, email: str, hash: str, salt: str, role: str, active: bool, photo: optStr, created_at: optStr, deactivated_reason: optStr },
    optional: ["photo", "created_at", "deactivated_reason"],
    unique: [{ email: 1 }],
  },
  password_resets: {
    key: "id",
    // Solicitada (the person asked) → Enviada (admin issued a link; only its hash is kept) → Usada.
    fields: { id: str, user_id: str, status: str, requested: str, token_hash: optStr, expires: { bsonType: ["number", "null"] }, issued_by: optStr },
    index: [{ user_id: 1, status: 1 }, { token_hash: 1 }],
  },
  sessions: {
    key: "token",
    fields: { token: str, user_id: str, expires: num },
    index: [{ user_id: 1 }, { expires: 1 }],
  },
  providers: {
    key: "id",
    fields: { id: str, trade: str, trades: { bsonType: "array", minItems: 1, items: str }, experience: str, zone: str, description: str, photo: str, document: str, status: str, active: bool,
      // Admin decisions: who decided, when, and the reason the person sees.
      reason: optStr, decided_by: optStr, decided_at: optStr, deactivated_reason: optStr,
      // Trades added after approval wait here until an admin reviews them.
      pending_trades: { bsonType: ["array", "null"], items: str } },
    optional: ["reason", "decided_by", "decided_at", "deactivated_reason", "pending_trades"],
    index: [{ trade: 1, status: 1 }, { trades: 1 }],
  },
  requests: {
    key: "id",
    // target: provider the client asked directly; empty means any approved provider of the trade.
    // status: Activa → Asignada → Terminado → Completado, or Cancelada / Vencida / En disputa.
    // closed_reason: why it was cancelled (by the client or administration).
    fields: { id: str, owner: str, trade: str, description: str, date: str, status: str, provider: optStr, quote: optStr, created: str, target: optStr, closed_reason: optStr,
      location: { bsonType: "object", required: ["lat", "lng"], additionalProperties: false, properties: { lat: { bsonType: "number", minimum: -90, maximum: 90 }, lng: { bsonType: "number", minimum: -180, maximum: 180 }, address: { bsonType: "string", maxLength: 300 } } } },
    optional: ["provider", "quote", "target", "closed_reason", "location"],
    index: [{ owner: 1 }, { provider: 1 }, { trade: 1, status: 1 }, { target: 1 }],
  },
  quotes: {
    key: "id",
    fields: { id: str, request: str, provider: str, price: num, description: str, status: str },
    unique: [{ request: 1, provider: 1 }],
  },
  files: {
    key: "id",
    // url: optional public address of the image (e.g. /media/<id>.png); the bytes stay in file_objects.
    fields: { id: str, owner: str, request: optStr, kind: str, mime: str, url: optStr },
    optional: ["request", "url"],
    index: [{ owner: 1 }, { request: 1 }],
  },
  trades: {
    key: "name",
    // The trades the platform offers; inactive ones leave the catalog and new requests.
    fields: { name: str, active: bool, order: num },
  },
  reports: {
    key: "id",
    // A problem reported on a job (Abierto → Resuelto); by: who reported, against: the other party.
    fields: { id: str, request: str, by: str, against: optStr, reason: str, status: str, created: str, previous_status: str, resolution: optStr, resolved_by: optStr, resolved_at: optStr },
    index: [{ request: 1 }, { status: 1 }],
  },
  settings: {
    key: "key",
    // One document (key "app") with the platform settings administration can change.
    fields: { key: str, registrationOpen: bool, providerApplicationsOpen: bool, requestExpiryDays: num, maxOpenRequests: num, updated_at: optStr, updated_by: optStr },
    optional: ["registrationOpen", "providerApplicationsOpen", "requestExpiryDays", "maxOpenRequests", "updated_at", "updated_by"],
  },
  audit_log: {
    key: "id",
    // One row per admin action: who did what to whom, and why.
    fields: { id: str, at: str, actor: str, actor_name: str, action: str, target: optStr, target_name: optStr, detail: optStr },
    index: [{ at: 1 }, { target: 1 }],
  },
  reviews: {
    key: "request",
    // hidden: an admin took it off the public profile and the rating (hidden_reason says why).
    fields: { request: str, provider: str, owner: str, stars: { bsonType: ["int", "null"], minimum: 1, maximum: 5 }, comment: optStr, hidden: { bsonType: ["bool", "null"] }, hidden_reason: optStr },
    optional: ["stars", "comment", "hidden", "hidden_reason"],
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
    if ("trades" in def.fields) await coll.updateMany({ trades: { $exists: false } }, [{ $set: { trades: ["$trade"] } }]);
    if ("active" in def.fields) await coll.updateMany({ active: { $exists: false } }, { $set: { active: true } });
    log(`${existing.has(name) ? "updated" : "created"} ${name}`);
  }
}
