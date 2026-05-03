import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/quiz/$id")({
  component: EditQuiz,
});

type Q = { id?: string; question: string; options: string[]; correct_index: number; position: number; _new?: boolean };

function EditQuiz() {
  const { id } = Route.useParams();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: quiz }, { data: qs }] = await Promise.all([
      supabase.from("quizzes").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").eq("quiz_id", id).order("position"),
    ]);
    if (quiz) setTitle(quiz.title);
    setQuestions(((qs as any[]) || []).map((q) => ({
      id: q.id, question: q.question, options: q.options as string[],
      correct_index: q.correct_index, position: q.position,
    })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`quiz-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `quiz_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const addQ = () => setQuestions([...questions, {
    question: "", options: ["", "", "", ""], correct_index: 0, position: questions.length, _new: true,
  }]);

  const updateQ = (i: number, patch: Partial<Q>) => {
    setQuestions(questions.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };

  const removeQ = async (i: number) => {
    const q = questions[i];
    if (q.id) await supabase.from("questions").delete().eq("id", q.id);
    setQuestions(questions.filter((_, idx) => idx !== i));
  };

  const saveAll = async () => {
    await supabase.from("quizzes").update({ title }).eq("id", id);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const payload = {
        quiz_id: id, question: q.question, options: q.options,
        correct_index: q.correct_index, position: i,
      };
      if (q.id) await supabase.from("questions").update(payload).eq("id", q.id);
      else await supabase.from("questions").insert(payload);
    }
    toast.success("Sauvegardé");
    load();
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to="/app" className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Retour</Link>
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-2xl font-bold border-0 px-0" />
      </div>

      {questions.map((q, i) => (
        <div key={i} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">Q{i + 1}</span>
            <Input value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} placeholder="Question" />
            <Button variant="outline" size="icon" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-2 border rounded-lg p-2 cursor-pointer ${q.correct_index === oi ? "border-success bg-success/10" : ""}`}>
                <input type="radio" checked={q.correct_index === oi} onChange={() => updateQ(i, { correct_index: oi })} />
                <Input value={opt} onChange={(e) => {
                  const newOpts = [...q.options]; newOpts[oi] = e.target.value;
                  updateQ(i, { options: newOpts });
                }} placeholder={`Option ${oi + 1}`} className="border-0 px-1" />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={addQ} variant="outline" className="flex-1"><Plus className="h-4 w-4 mr-1" />Ajouter une question</Button>
        <Button onClick={saveAll} className="bg-gradient-primary text-primary-foreground"><Save className="h-4 w-4 mr-1" />Sauvegarder</Button>
        <Link to="/app/play/$id" params={{ id }}>
          <Button variant="outline"><Play className="h-4 w-4 mr-1" />Jouer</Button>
        </Link>
      </div>
    </div>
  );
}
