-- FitLife - Progresso visual
-- Cole este arquivo no Supabase SQL Editor para ativar fotos de progresso no Storage.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  weight NUMERIC,
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can manage their own progress photos" ON progress_photos;
CREATE POLICY "Users can manage their own progress photos"
ON progress_photos
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own body measurements" ON body_measurements;
CREATE POLICY "Users can manage their own body measurements"
ON body_measurements
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can read their own progress photo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own progress photo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own progress photo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own progress photo files" ON storage.objects;

CREATE POLICY "Users can read their own progress photo files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own progress photo files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own progress photo files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own progress photo files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
