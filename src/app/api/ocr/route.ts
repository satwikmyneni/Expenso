import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Receipt OCR runs locally in the authenticated browser. Receipt images must not be posted to this endpoint." },
    { status: 400 },
  );
}
