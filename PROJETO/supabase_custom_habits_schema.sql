-- FitLife - Habitos personalizados
-- Cole este arquivo no Supabase SQL Editor para ativar a aba Habitos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS custom_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '✨',
  color TEXT DEFAULT '#22c55e',
  category TEXT DEFAULT 'health',
  difficulty TEXT DEFAULT 'easy',
  type TEXT NOT NULL DEFAULT 'boolean',
  target NUMERIC DEFAULT 1,
  unit TEXT,
  xp INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE custom_habits ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'health';
ALTER TABLE custom_habits ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'easy';
ALTER TABLE custom_habits ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE custom_habits ADD COLUMN IF NOT EXISTS reminder_time TEXT;

CREATE TABLE IF NOT EXISTS custom_habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES custom_habits ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

ALTER TABLE custom_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_habit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'custom_habits'
      AND policyname = 'Users can manage their own custom habits'
  ) THEN
    CREATE POLICY "Users can manage their own custom habits"
    ON custom_habits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'custom_habit_logs'
      AND policyname = 'Users can manage their own custom habit logs'
  ) THEN
    CREATE POLICY "Users can manage their own custom habit logs"
    ON custom_habit_logs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
