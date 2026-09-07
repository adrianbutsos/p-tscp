"use client";
import { createClient } from "@/lib/supabase/browser";
export function SignOutButton() { return <button className="button" onClick={async () => { await createClient().auth.signOut(); window.location.href = "/login"; }}>Sign out</button>; }
