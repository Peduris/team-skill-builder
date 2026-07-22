import { NextResponse } from "next/server";
import { listSkills } from "@/lib/github";
import { githubConfigured } from "@/lib/env";
import type { ExistingSkill } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 60_000;
let cache: { at: number; data: ExistingSkill[] } | null = null;

export async function GET(request: Request) {
  if (!githubConfigured()) {
    return NextResponse.json({ configured: false, skills: [] });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ configured: true, skills: cache.data, cached: true });
  }

  try {
    const skills = await listSkills();
    cache = { at: Date.now(), data: skills };
    return NextResponse.json({ configured: true, skills, cached: false });
  } catch (err) {
    return NextResponse.json(
      { configured: true, skills: [], error: (err as Error).message },
      { status: 502 },
    );
  }
}
