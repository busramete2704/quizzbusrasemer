import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { generateQuestions } from "@/quiz.functions";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2 } from "lucide-react";

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
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
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

  const createWithAI = async () => {
    if (!title.trim()) return toast.error("Donne un titre");
    if (text.trim().length < 50) return toast.error("Texte trop court (min 50 caractères)");
    setLoading(true);
    try {
      const { questions } = await generateFn({ data: { text, count } });
      if (!questions.length) throw new Error("Aucune question générée");
      const { data: quiz, error } = await supabase
        .from("quizzes").insert({ title, description }).select().single();
      if (error) throw error;
      const rows = questions.map((q: any, i: number) => ({
        quiz_id: quiz.id, question: q.question, options: q.options,
        correct_index: q.correct_index, position: i,
      }));
      const { error: e2 } = await supabase.from("questions").insert(rows);
      if (e2) throw e2;
      toast.success(`${questions.length} questions créées !`);
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
      .from("quizzes").insert({ title, description }).select().single();
    if (error) return toast.error(error.message);
    navigate({ to: "/app/quiz/$id", params: { id: quiz.id } });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Créer un quiz</h1>

      <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
        <div>
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mon super quiz" />
        </div>
        <div>
          <Label>Description (optionnel)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" />Avec IA</TabsTrigger>
          <TabsTrigger value="manual">Sans IA (manuel)</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <Label>Importer un PDF ou Word</Label>
              <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-accent/30">
                <Upload className="h-5 w-5" />
                <span>Choisir un fichier (.pdf, .docx, .txt)</span>
                <input type="file" accept=".pdf,.docx,.txt" onChange={onFile} className="hidden" />
              </label>
            </div>
            <div>
              <Label>Ou colle ton texte</Label>
              <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Colle ici un cours, un article..." />
            </div>
            <div>
              <Label>Nombre de questions: {count}</Label>
              <input type="range" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            </div>
            <Button onClick={createWithAI} disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération...</> : <><Sparkles className="h-4 w-4 mr-2" />Générer le quiz</>}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
            <p className="text-muted-foreground text-sm">Crée un quiz vide puis ajoute tes questions une par une.</p>
            <Button onClick={createEmpty} className="w-full bg-gradient-primary text-primary-foreground">Créer un quiz vide</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
