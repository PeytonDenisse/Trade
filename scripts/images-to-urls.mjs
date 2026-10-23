// Exports public images (provider photos, before/after) from MongoDB to public/media
// and stores their URL in `files.url`, so pages load them directly instead of via /api/files.
// ID documents and problem photos stay private and are never exported.
// Run: pnpm images:urls            (dry run, lists what would change)
//      pnpm images:urls --apply    (writes public/media/* and updates MongoDB)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const PUBLIC_KINDS = ["photo", "before", "after"];
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
const apply = process.argv.includes("--apply");
const outDir = path.resolve("public/media");

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  const db = client.db(process.env.MONGODB_DB || "trade");
  const files = await db.collection("files").find({ kind: { $in: PUBLIC_KINDS }, url: { $in: [null, undefined] } }).toArray();
  let exported = 0, missing = 0;
  if (apply) mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    const ext = EXT[file.mime];
    const object = await db.collection("file_objects").findOne({ _id: file.id });
    if (!ext || !/^[\w.-]+$/.test(file.id) || !object) { missing++; console.log(`skip ${file.id} (${object ? file.mime : "bytes not in MongoDB"})`); continue; }
    const url = `/media/${file.id}.${ext}`;
    if (apply) {
      writeFileSync(path.join(outDir, `${file.id}.${ext}`), object.data.buffer);
      await db.collection("files").updateOne({ id: file.id }, { $set: { url } });
    }
    exported++;
    console.log(`${apply ? "exported" : "would export"} ${file.kind} ${url}`);
  }
  console.log(`${exported} ${apply ? "exported" : "to export"}, ${missing} skipped.${apply ? "" : " Run with --apply to write them."}`);
} catch (err) {
  console.error("Export failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
