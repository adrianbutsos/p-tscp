import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ count: campaigns }, { count: audiences }, { count: sources }, { count: runs }] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
    supabase.from("target_audiences").select("id", { count: "exact", head: true }),
    supabase.from("benchmark_sources").select("id", { count: "exact", head: true }),
    supabase.from("benchmark_runs").select("id", { count: "exact", head: true })
  ]);
  return <main className="main"><div className="hero"><div><h1>Administration dashboard</h1><p className="muted">Manage the operating configuration for the TSCP content strategy agent.</p></div><Link className="button primary" href="/admin/runs">Start a benchmark run</Link></div><div className="grid"><div className="card"><div className="muted">Active campaigns</div><div className="metric">{campaigns ?? 0}</div><Link href="/admin/campaigns">Manage campaigns →</Link></div><div className="card"><div className="muted">Target audiences</div><div className="metric">{audiences ?? 0}</div><Link href="/admin/audiences">Manage audiences →</Link></div><div className="card"><div className="muted">Benchmark sources</div><div className="metric">{sources ?? 0}</div><Link href="/admin/sources">Manage sources →</Link></div><div className="card"><div className="muted">Benchmark runs</div><div className="metric">{runs ?? 0}</div><Link href="/admin/runs">View run history →</Link></div></div><section className="card" style={{marginTop: "1rem"}}><h2>Operational flow</h2><div className="flow"><div className="flow-item">Supabase configuration</div><div className="arrow">→</div><div className="flow-item">Benchmark request</div><div className="arrow">→</div><div className="flow-item">Monthly calendar</div></div><p className="muted">Supabase is the operational source of truth. GitHub stores the implementation and migrations. Notion remains the documentation and no-code reference layer.</p></section></main>;
}
