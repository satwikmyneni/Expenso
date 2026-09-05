import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI-assisted image extraction is intentionally disabled in this release." },
    { status: 503 },
  );
}
