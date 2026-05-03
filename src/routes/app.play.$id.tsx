import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Home } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/play/$id")({
  component: PlayPage,
});

type Q = { id: string; question: string; options: string[]; correct_index: number };
type Mode = "solo" | "duo";

const SOLO_NAME_KEY = "quizzb_solo_name";

function PlayPage() {
  const { id } = Route.useParams();
  const [quiz, setQuiz] = useState<{ title: string } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [p1, setP1] = useState("Büsra");
  const [p2, setP2] = useState("Semer");
  const [step, setStep] = useState<"setup" | "play" | "done">("setup");
  const [current, setCurrent] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0); // duo only
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [timeLeft, setTimeLeft] = useState(45);
  const [picked, setPicked] = useState<number | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const [{ data: q }, { data: qs }] = await Promise.all([
        supabase.from("quizzes").select("title").eq("id", id).single(),
        supabase.from("questions").select("*").eq("quiz_id", id).order("position"),
      ]);
      setQuiz(q);
      setQuestions(((qs as any[]) || []).map((x) => ({
        id: x.id, question: x.question, options: x.options as string[], correct_index: x.correct_index,
      })));
    })();
  }, [id]);

  // Timer
  useEffect(() => {
    if (step !== "play" || picked !== null) return;
    setTimeLeft(45);
    startedAt.current = Date.now();
    const t = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const left = Math.max(0, 45 - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(t);
        handlePick(-1);
      }
    }, 100);
    return () => clearInterval(t);
  }, [step, current, turn, picked]);

  const handlePick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    const q = questions[current];
    const elapsed = (Date.now() - startedAt.current) / 1000;
    const correct = idx === q.correct_index;
    let pts = 0;
    if (correct) {
      // base 100 + speed bonus up to 100
      pts = Math.round(100 + Math.max(0, (45 - elapsed) / 45) * 100);
    }
    const player = mode === "solo" ? 0 : turn;
    setScores((s) => {
      const ns: [number, number] = [...s] as any;
      ns[player] += pts;
      return ns;
    });
    setTimeout(() => next(), 1200);
  };

  const next = async () => {
    setPicked(null);
    if (mode === "duo") {
      // alternate after each question
      const nextTurn = (turn === 0 ? 1 : 0) as 0 | 1;
      setTurn(nextTurn);
      // both players answered each question? We alternate per question (each plays half).
      // Actually: each Q answered once. So advance current always.
    }
    if (current + 1 >= questions.length) {
      await finish();
      return;
    }
    setCurrent((c) => c + 1);
  };

  const finish = async () => {
    setStep("done");
    await supabase.from("game_history").insert({
      quiz_id: id,
      quiz_title: quiz?.title || "Quiz",
      mode: mode!,
      player1_name: mode === "solo" ? p1 : p1,
      player1_score: scores[0],
      player2_name: mode === "duo" ? p2 : null,
      player2_score: mode === "duo" ? scores[1] : null,
    });
  };

  if (!quiz) return <p>Chargement...</p>;
  if (questions.length === 0) return (
    <div className="text-center py-16">
      <p className="mb-4">Ce quiz n'a pas encore de questions.</p>
      <Link to="/app/quiz/$id" params={{ id }}><Button>Ajouter des questions</Button></Link>
    </div>
  );

  if (step === "setup") {
    return (
      <div className="max-w-md mx-auto bg-card rounded-2xl p-6 shadow-card space-y-4">
        <h1 className="text-2xl font-black">{quiz.title}</h1>
        <p className="text-muted-foreground">{questions.length} questions • +100 pts par bonne réponse + bonus rapidité</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-20 flex-col" onClick={() => { setMode("solo"); const n = localStorage.getItem(SOLO_NAME_KEY) || "Büsra"; setP1(n); setStep("play"); }}>
            <span className="text-lg font-bold">Solo</span>
            <span className="text-xs text-muted-foreground">Joue seul·e</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => { setMode("duo"); setStep("play"); }}>
            <span className="text-lg font-bold">À deux</span>
            <span className="text-xs text-muted-foreground">Büsra vs Semer</span>
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Joueur 1</label>
          <input className="w-full border rounded px-3 py-2" value={p1} onChange={(e) => { setP1(e.target.value); localStorage.setItem(SOLO_NAME_KEY, e.target.value); }} />
          <label className="text-sm">Joueur 2 (mode duo)</label>
          <input className="w-full border rounded px-3 py-2" value={p2} onChange={(e) => setP2(e.target.value)} />
        </div>
      </div>
    );
  }

  if (step === "done") {
    const winner = mode === "duo" ? (scores[0] > scores[1] ? p1 : scores[1] > scores[0] ? p2 : null) : p1;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <Trophy className="h-16 w-16 mx-auto text-gold" />
        <h1 className="text-4xl font-black">Terminé !</h1>
        {mode === "duo" ? (
          <Podium p1={p1} s1={scores[0]} p2={p2} s2={scores[1]} />
        ) : (
          <div className="bg-card rounded-2xl p-8 shadow-elegant">
            <p className="text-2xl font-bold">{p1}</p>
            <p className="text-5xl font-black text-primary mt-2">{scores[0]} pts</p>
          </div>
        )}
        {mode === "duo" && winner && <p className="text-xl">🎉 Bravo <span className="font-bold">{winner}</span> !</p>}
        {mode === "duo" && !winner && <p className="text-xl">Égalité !</p>}
        <div className="flex gap-2 justify-center">
          <Link to="/app"><Button variant="outline"><Home className="h-4 w-4 mr-1" />Accueil</Button></Link>
          <Button onClick={() => { setStep("setup"); setCurrent(0); setScores([0, 0]); setTurn(0); }} className="bg-gradient-primary text-primary-foreground">Rejouer</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const playerName = mode === "duo" ? (turn === 0 ? p1 : p2) : p1;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Question {current + 1}/{questions.length}</span>
        {mode === "duo" && <span className="font-bold text-primary">Tour de {playerName}</span>}
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{timeLeft.toFixed(1)}s</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${(timeLeft / 45) * 100}%` }} />
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-elegant">
        <h2 className="text-xl font-bold mb-6">{q.question}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const isCorrect = picked !== null && i === q.correct_index;
            const isWrong = picked === i && i !== q.correct_index;
            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={picked !== null}
                className={`p-4 rounded-xl border-2 text-left font-medium transition ${
                  isCorrect ? "border-success bg-success/15" :
                  isWrong ? "border-destructive bg-destructive/15" :
                  picked !== null ? "opacity-50" :
                  "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-around bg-card rounded-xl p-3 shadow-card">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">{p1}</div>
          <div className="text-xl font-bold">{scores[0]}</div>
        </div>
        {mode === "duo" && (
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{p2}</div>
            <div className="text-xl font-bold">{scores[1]}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Podium({ p1, s1, p2, s2 }: { p1: string; s1: number; p2: string; s2: number }) {
  const winner = s1 >= s2 ? { n: p1, s: s1 } : { n: p2, s: s2 };
  const loser = s1 >= s2 ? { n: p2, s: s2 } : { n: p1, s: s1 };
  return (
    <div className="flex items-end justify-center gap-3 h-64">
      <div className="flex flex-col items-center w-32">
        <div className="text-2xl mb-1">🥈</div>
        <div className="font-bold">{loser.n}</div>
        <div className="text-sm text-muted-foreground">{loser.s} pts</div>
        <div className="w-full bg-silver rounded-t-lg mt-2" style={{ height: "100px" }} />
      </div>
      <div className="flex flex-col items-center w-32">
        <Trophy className="h-8 w-8 text-gold mb-1" />
        <div className="font-bold">{winner.n}</div>
        <div className="text-sm text-muted-foreground">{winner.s} pts</div>
        <div className="w-full bg-gold rounded-t-lg mt-2" style={{ height: "150px" }} />
      </div>
    </div>
  );
}
