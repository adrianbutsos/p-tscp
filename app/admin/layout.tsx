import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="shell"><header className="topbar"><Link href="/admin" className="brand">TSCP Content Strategy Agent<span>Supabase-backed administration</span></Link><nav className="nav"><Link href="/admin/campaigns">Campaigns</Link><Link href="/admin/audiences">Audiences</Link><Link href="/admin/sources">Sources</Link><Link href="/admin/runs">Runs</Link><SignOutButton /></nav></header>{children}</div>;
}
