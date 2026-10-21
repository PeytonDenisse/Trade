import { MongoClient, type Db } from "mongodb";

export type DbEnv = { MONGODB_URI?: string; MONGODB_DB?: string; MONGO?: Db };

// Workers cannot reuse a socket opened by another request, so each request opens
// and closes its own client. `MONGO` lets tests pass an already connected database.
export async function withDb<T>(env: DbEnv, fn: (db: Db) => Promise<T>): Promise<T> {
  if (env.MONGO) return fn(env.MONGO);
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI no está configurado. Copia .env.example a .env.");
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 1 });
  try {
    return await fn(client.db(env.MONGODB_DB || "trade"));
  } finally {
    await client.close();
  }
}
