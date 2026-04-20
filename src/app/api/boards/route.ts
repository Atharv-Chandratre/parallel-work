import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BOARDS_FILE = path.join(DATA_DIR, "boards.json");
const LEGACY_BOARD_FILE = path.join(DATA_DIR, "board.json");

// On serverless hosts (Vercel, AWS Lambda, etc.) the app root is a read-only
// bundle — we can't persist /var/task/data. Signal that to the client so it
// stays in localStorage-only mode instead of toasting "HTTP 500" on every edit.
const IS_READ_ONLY_FS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function readOnlyResponse() {
  return NextResponse.json(
    {
      code: "STORAGE_READONLY",
      error:
        "Server storage is read-only in this environment; the client will persist to localStorage.",
    },
    { status: 503 }
  );
}

function isReadOnlyFsError(err: unknown): boolean {
  if (!(err instanceof Error) || !("code" in err)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  // EROFS: read-only fs. EACCES: no write permission. ENOENT on mkdir: the
  // parent dir itself doesn't exist (happens on Vercel's /var/task).
  return code === "EROFS" || code === "EACCES" || code === "ENOENT";
}

async function migrateLegacyIfNeeded() {
  try {
    await fs.access(BOARDS_FILE);
    return; // already migrated
  } catch {
    // missing — try legacy
  }
  try {
    const raw = await fs.readFile(LEGACY_BOARD_FILE, "utf-8");
    const legacy = JSON.parse(raw);
    if (legacy && typeof legacy === "object" && Array.isArray(legacy.columns)) {
      const id = typeof legacy.id === "string" ? legacy.id : "default";
      const collection = {
        activeBoardId: id,
        boards: {
          [id]: { ...legacy, id, name: legacy.name ?? "My Board" },
        },
      };
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(BOARDS_FILE, JSON.stringify(collection, null, 2), "utf-8");
    }
  } catch {
    // no legacy file, nothing to migrate
  }
}

export async function GET() {
  if (IS_READ_ONLY_FS) return readOnlyResponse();
  try {
    await migrateLegacyIfNeeded();
    const raw = await fs.readFile(BOARDS_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(null);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/boards] GET failed:", err);
    return NextResponse.json({ error: "Failed to read boards", detail: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (IS_READ_ONLY_FS) return readOnlyResponse();
  try {
    const payload = await request.json();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(BOARDS_FILE, JSON.stringify(payload, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (isReadOnlyFsError(err)) {
      // Belt-and-suspenders: env check missed some platform, but the filesystem
      // is clearly read-only. Tell the client to stop trying.
      console.warn("[api/boards] PUT fell back to localStorage-only: read-only FS", err);
      return readOnlyResponse();
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/boards] PUT failed:", err);
    return NextResponse.json({ error: "Failed to save boards", detail: message }, { status: 500 });
  }
}
