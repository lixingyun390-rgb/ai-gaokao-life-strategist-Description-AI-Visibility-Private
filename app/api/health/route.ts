import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "AI高考人生军师",
    time: new Date().toISOString(),
    provider: process.env.AI_PROVIDER ?? "unset",
  });
}
