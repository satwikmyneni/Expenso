import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI features are intentionally disabled in this release." },
    { status: 503 },
  );
}
