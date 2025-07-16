"use client";
import React, { useEffect, useState } from "react";
import "./globals.css";
import { supabase } from "./supabaseClient";

type SupabaseUser = {
  id: string;
  email: string | undefined;
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser|null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? '' });
      else setUser(null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const signInWithGoogle = async () => {
    let redirectTo = "";
    if (typeof window !== "undefined") {
      redirectTo = window.location.origin + window.location.pathname;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <html lang="ja">
      <body>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: 12 }}>
          {user ? (
            <>
              <span style={{ color: "#bfae9e", fontWeight: 600, fontSize: 14 }}>ログイン中: {user.email}</span>
              <button style={{ background: "#f3b6c2", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }} onClick={signOut}>ログアウト</button>
            </>
          ) : (
            <button style={{ background: "#e7bfa7", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }} onClick={signInWithGoogle}>Googleでログイン</button>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}
