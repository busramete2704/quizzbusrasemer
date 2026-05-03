import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: QuizList,
});

type Quiz = { id: string; title: string; description: string | null; created_at: string };

function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    setQuizzes((data as Quiz[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("quizzes-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "quizzes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce quiz ?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Quiz supprimé");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Vos Quizz</h1>
          <p className="text-muted-foreground">Partagés en temps réel entre Baptiste & Büsra</p>
        </div>
        <Link to="/app/create">
          <Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Nouveau</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-card">
          <p className="text-muted-foreground mb-4">Aucun quiz pour le moment</p>
          <Link to="/app/create"><Button className="bg-gradient-primary text-primary-foreground">Créer le premier quiz</Button></Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-elegant transition">
              <h3 className="font-bold text-lg mb-1">{q.title}</h3>
              {q.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{q.description}</p>}
              <div className="flex gap-2 mt-4">
                <Link to="/app/play/$id" params={{ id: q.id }} className="flex-1">
                  <Button className="w-full bg-gradient-primary text-primary-foreground"><Play className="h-4 w-4 mr-1" />Jouer</Button>
                </Link>
                <Link to="/app/quiz/$id" params={{ id: q.id }}>
                  <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                </Link>
                <Button variant="outline" size="icon" onClick={() => remove(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
