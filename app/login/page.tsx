import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/admin");
  return <main className="main" style={{maxWidth: 560, paddingTop: "8vh"}}><div className="card"><h1>TSCP Content Strategy Agent</h1><p className="muted">Sign in to manage campaigns, audiences, benchmark sources, and monthly planning runs.</p><LoginForm /></div></main>;
}
