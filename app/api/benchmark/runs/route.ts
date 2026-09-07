import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const schema = z.object({ trigger: z.enum(["scheduled", "on_demand"]).default("on_demand"), period_start: z.string().date().optional(), period_end: z.string().date().optional() });
function nextMonthPeriod() { const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)); const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }; }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid run request" }, { status: 400 });
  const fallback = nextMonthPeriod();
  const start = parsed.data.period_start ?? fallback.start;
  const end = parsed.data.period_end ?? fallback.end;
  const { data: sources } = await supabase.from("benchmark_sources").select("id,name,source_type,platforms,url,search_queries").eq("enabled", true);
  const { data: audiences } = await supabase.from("target_audiences").select("name,description,preferred_platforms,content_angles").eq("enabled", true);
  const requestJson = { period_start: start, period_end: end, sources: sources ?? [], audiences: audiences ?? [] };
  const { data: run, error } = await supabase.from("benchmark_runs").insert({ period_start: start, period_end: end, trigger: parsed.data.trigger, status: process.env.OPENAI_API_KEY ? "running" : "blocked", requested_by: user.id, request_json: requestJson, error_message: process.env.OPENAI_API_KEY ? null : "OPENAI_API_KEY is not configured on the server." }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server.", run }, { status: 503 });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        input: `You are the TSCP monthly benchmark research agent. Return JSON only. Research period: ${start} to ${end}. Use the configured public sources and audiences below. Do not invent URLs or facts; if a source cannot be verified, omit it. Return {"observations":[{"source_url":string,"published_at":"YYYY-MM-DD","platform":string,"content_type":string,"theme":string,"summary":string,"signals":object,"relevance_to_tscp":"high|medium|low|unknown","adaptation_notes":string}]}. Sources: ${JSON.stringify(sources ?? [])}. Audiences: ${JSON.stringify(audiences ?? [])}`,
        text: { format: { type: "json_object" } },
      }),
    });
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    if (!response.ok) throw new Error(payload.output_text || "OpenAI request failed");
    const outputText = payload.output_text || payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") || "{}";
    const result = z.object({ observations: z.array(z.object({ source_url: z.string().url(), published_at: z.string().date(), platform: z.string(), content_type: z.string(), theme: z.string(), summary: z.string(), signals: z.record(z.string(), z.unknown()).default({}), relevance_to_tscp: z.enum(["high", "medium", "low", "unknown"]), adaptation_notes: z.string() })) }).parse(JSON.parse(outputText));
    const sourceByUrl = new Map((sources ?? []).map((source) => [source.url, source.id]));
    if (result.observations.length) {
      const { error: observationError } = await supabase.from("benchmark_observations").insert(result.observations.map((observation) => ({ ...observation, run_id: run.id, source_id: sourceByUrl.get(observation.source_url) ?? null })));
      if (observationError) throw observationError;
    }
    const { data: completed, error: updateError } = await supabase.from("benchmark_runs").update({ status: "completed", completed_at: new Date().toISOString(), error_message: null }).eq("id", run.id).select().single();
    if (updateError) throw updateError;
    return NextResponse.json({ run: completed, observations_created: result.observations.length }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Benchmark run failed";
    await supabase.from("benchmark_runs").update({ status: "failed", error_message: message }).eq("id", run.id);
    return NextResponse.json({ error: message, run: { ...run, status: "failed" } }, { status: 502 });
  }
}
