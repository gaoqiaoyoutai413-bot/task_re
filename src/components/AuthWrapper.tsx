"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.provider_token) {
        localStorage.setItem('provider_token', session.provider_token);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.provider_token) {
        localStorage.setItem('provider_token', session.provider_token);
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('provider_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center paper-texture">
        <span className="text-black/30 font-serif italic">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center p-12 paper-texture rounded-sm shadow-2xl max-w-md w-full border border-black/5 text-center">
          <h2 className="text-2xl font-serif mb-4 text-black/80">Analog-Digital Task</h2>
          <p className="text-sm text-black/60 mb-8 leading-relaxed">
            Googleカレンダー連携とデータ保存のため、<br/>
            Googleアカウントでログインしてください。
          </p>
          <button
            onClick={() => supabase.auth.signInWithOAuth({ 
              provider: "google", 
              options: { 
                scopes: "https://www.googleapis.com/auth/calendar",
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent'
                }
              } 
            })}
            className="px-6 py-3 bg-white border border-black/10 rounded shadow-sm hover:shadow-md transition-shadow font-medium text-black/70 flex items-center gap-2"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
