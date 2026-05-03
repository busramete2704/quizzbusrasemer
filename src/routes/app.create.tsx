import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2 } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { generateQuestions } from "@/server/quiz.functions";

export const Route = createFileRoute("/app/create")({
  component: CreatePage,
});

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }

  if (name.endsWith(".pdf")) {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      text += c.items.map((it: any) => it.str).join(" ") + "\n";
    }

    return text;
  }

  return await file.text();
}

function CreatePage() {
  const navigate = useNavigate();

  // ✅ server function correctement déclaré
  const generateFn = useServerFn(generateQuestions);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      toast.info("Lecture du fichier...");
      const t = await extractText(f);
      setText(t);

      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));

      toast.success(`${t.length} caractères extraits`);
    } catch (err: any) {
      toast.error("Impossible de lire le fichier: " + err.message);
    }
  };

  // 🚀 IA + Supabase
  const createWithAI = async () => {
    if (!title.trim()) return toast.error("Donne un titre");
    if (text.trim().length < 50) return toast.error("Texte trop court");

    setLoading(true);

    try {
      // 👉 appel backend IA (TanStack server function)
      const aiQuestions = await generateFn({
        text,
        count,
      });

      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({ title, description })
        .select()
        .single();

      if (error) throw error;

      const rows = aiQuestions.map((q: any, i: number) => ({
        quiz_id: quiz.id,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        position: i,
      }));

      const { error: e2 } = await supabase
        .from("questions")
        .insert(rows);

      if (e2) throw e2;

      toast.success("Quiz créé !");
      navigate({ to: "/app/quiz/$id", params: { id: quiz.id } });

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createEmpty = async () => {
    if (!title.trim()) return toast.error("Donne un titre");

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({ title, description })
      .select()
      .single();

    if (error) return toast.error(error.message);

    navigate({ to: "/app/quiz/$id", params: { id: quiz.id } });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Créer un quiz</h1>

      <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
        <div>
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-1" />
            Avec IA
          </TabsTrigger>
          <TabsTrigger value="manual">
            Sans IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">

            <div>
              <Label>Importer un fichier</Label>
              <input type="file" accept=".pdf,.docx,.txt" onChange={onFile} />
            </div>

            <div>
              <Label>Texte</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} />
            </div>

            <div>
              <Label>Nombre de questions: {count}</Label>
              <input
                type="range"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <Button
              onClick={createWithAI}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer le quiz
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
            <p>Créer un quiz vide puis ajouter les questions après.</p>

            <Button onClick={createEmpty} className="w-full">
              Créer un quiz vide
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
