import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "./campaign-form";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase.from("campaigns").select("*").order("created_at");
  return <main className="main"><div className="hero"><div><h1>Active campaigns</h1><p className="muted">Configure the campaigns used by the strategy agent.</p></div><CampaignForm /></div>{error ? <p className="error">{error.message}</p> : <div className="table-wrap"><table><thead><tr><th>Campaign</th><th>Priority</th><th>Target share</th><th>Status</th><th>Description</th></tr></thead><tbody>{(campaigns ?? []).map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong></td><td><span className="badge">{campaign.priority}</span></td><td>{Math.round(Number(campaign.target_share) * 100)}%</td><td>{campaign.enabled ? "Enabled" : "Disabled"}</td><td>{campaign.description}</td></tr>)}</tbody></table></div>}</main>;
}
