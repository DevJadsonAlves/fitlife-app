-- FitLife - Medidas corporais
-- Cole este arquivo no Supabase SQL Editor para ativar o historico de medidas.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  weight NUMERIC,
  body_fat NUMERIC,
  neck NUMERIC,
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  arm NUMERIC,
  thigh NUMERIC,
  calf NUMERIC,
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own body measurements" ON body_measurements;
CREATE POLICY "Users can manage their own body measurements"
ON body_measurements
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
