import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Connexion — QuizzB" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("semerbusra@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.toLowerCase().includes("invalid")) {
      // First time: create the shared account
      const signup = await supabase.auth.signUp({ email, password });
      if (signup.error) {
        toast.error(signup.error.message);
        setLoading(false);
        return;
      }
      const retry = await supabase.auth.signInWithPassword({ email, password });
      error = retry.error;
    }
    if (error) {
      toast.error("Identifiants invalides");
      setLoading(false);
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl p-8 shadow-elegant">
        <h1 className="text-3xl font-black mb-2">QuizzB</h1>
        <p className="text-muted-foreground mb-6">Compte partagé Baptiste & Büsra</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
