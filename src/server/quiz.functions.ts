import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(50).max(50000),
  count: z.number().min(1).max(30),
});

export const generateQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `À partir du texte suivant, génère exactement ${data.count} questions à choix multiples (4 options chacune, une seule correcte). Réponds UNIQUEMENT en JSON valide au format: {"questions":[{"question":"...","options":["a","b","c","d"],"correct_index":0}]}.\n\nTEXTE:\n${data.text.slice(0, 30000)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un générateur de quizz. Réponds toujours en JSON strict." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      throw new Error("Échec de la génération IA");
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const questions = (parsed.questions || []).slice(0, data.count).map((q: any) => ({
      question: String(q.question || "").slice(0, 500),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o).slice(0, 200)) : [],
      correct_index: Number.isInteger(q.correct_index) ? q.correct_index : 0,
    })).filter((q: any) => q.options.length === 4);

    return { questions };
  });
