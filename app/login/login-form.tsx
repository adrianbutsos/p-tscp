"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (authError) setError(authError.message); else setMessage("Check your email for the secure sign-in link.");
    setLoading(false);
  }
  return <form className="form" onSubmit={submit}><label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.org" /></label><button className="button primary" disabled={loading}>{loading ? "Sending…" : "Send magic link"}</button>{message && <p className="notice">{message}</p>}{error && <p className="error">{error}</p>}</form>;
}
