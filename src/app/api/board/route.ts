import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BOARD_FILE = path.join(DATA_DIR, "board.json");

export async function GET() {
  try {
    const raw = await fs.readFile(BOARD_FILE, "utf-8");
    const board = JSON.parse(raw);
    return NextResponse.json(board);
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: "Failed to read board" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const board = await request.json();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(BOARD_FILE, JSON.stringify(board, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save board" }, { status: 500 });
  }
}
