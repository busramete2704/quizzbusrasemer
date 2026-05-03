import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

type H = {
  id: string; quiz_title: string; mode: string; created_at: string;
  player1_name: string; player1_score: number;
  player2_name: string | null; player2_score: number | null;
};

function HistoryPage() {
  const [items, setItems] = useState<H[]>([]);

  const load = async () => {
    const { data } = await supabase.from("game_history").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data as H[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("history")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_history" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-black">Historique</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Aucune partie pour le moment.</p>
      ) : (
        items.map((h) => {
          const winner = h.player2_name && h.player2_score !== null
            ? (h.player1_score > h.player2_score ? h.player1_name : h.player2_score > h.player1_score ? h.player2_name : null)
            : h.player1_name;
          return (
            <div key={h.id} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{h.quiz_title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("fr-FR")} • {h.mode === "duo" ? "À deux" : "Solo"}
                  </div>
                </div>
                {winner && <div className="flex items-center gap-1 text-sm font-medium"><Trophy className="h-4 w-4 text-gold" />{winner}</div>}
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <div><span className="text-muted-foreground">{h.player1_name}:</span> <span className="font-bold">{h.player1_score}</span></div>
                {h.player2_name && (
                  <div><span className="text-muted-foreground">{h.player2_name}:</span> <span className="font-bold">{h.player2_score}</span></div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
