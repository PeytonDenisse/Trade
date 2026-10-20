// Checks the MongoDB connection from .env. Run: pnpm db:ping
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "trade";
if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  const collections = await db.listCollections().toArray();
  console.log(`Connected to ${new URL(uri.replace("mongodb+srv", "http")).host}, database "${dbName}".`);
  console.log(`Collections: ${collections.map((c) => c.name).join(", ") || "(none yet)"}`);
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
