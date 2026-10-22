declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MONGODB_URI?: string;
    MONGODB_DB?: string;
    MONGODB_FILES?: string;
    DEMO_ENABLED?: string;
  }
}
