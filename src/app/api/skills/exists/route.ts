import { NextResponse } from "next/server";
import { skillExists } from "@/lib/github";
import { githubConfigured } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() || "";
  if (!slug) return NextResponse.json({ exists: false });
  if (!githubConfigured()) return NextResponse.json({ exists: false, configured: false });
  try {
    const exists = await skillExists(slug);
    return NextResponse.json({ exists, configured: true });
  } catch (err) {
    return NextResponse.json({ exists: false, error: (err as Error).message }, { status: 502 });
  }
}
