import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BOARDS_FILE = path.join(DATA_DIR, "boards.json");
const LEGACY_BOARD_FILE = path.join(DATA_DIR, "board.json");

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
  try {
    await migrateLegacyIfNeeded();
    const raw = await fs.readFile(BOARDS_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: "Failed to read boards" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(BOARDS_FILE, JSON.stringify(payload, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save boards" }, { status: 500 });
  }
}
