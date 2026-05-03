import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "QuizzB — Baptiste & Büsra" },
      { name: "description", content: "L'app de quiz personnalisée de Baptiste & Büsra." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 text-white">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur mb-8">
          <Sparkles className="h-4 w-4" />
          Bien conçu pour Baptiste & Büsra
        </div>
        <h1 className="text-7xl font-black tracking-tight mb-6">QuizzB</h1>
        <p className="text-xl text-white/80 mb-12">
          Crée des quizz personnalisés, joue en solo ou à deux, et voyez qui finit sur le podium.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-xl bg-white text-primary px-10 py-4 text-lg font-semibold shadow-elegant hover:scale-105 transition-transform"
        >
          Commencer
        </Link>
      </div>
    </div>
  );
}
