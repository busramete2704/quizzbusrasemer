
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.game_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  quiz_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player1_score INT NOT NULL DEFAULT 0,
  player2_name TEXT,
  player2_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Shared account: any authenticated user can do everything
CREATE POLICY "auth all quizzes" ON public.quizzes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all questions" ON public.questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all history" ON public.game_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_history;
ALTER TABLE public.quizzes REPLICA IDENTITY FULL;
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.game_history REPLICA IDENTITY FULL;
