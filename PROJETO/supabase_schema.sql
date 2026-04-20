-- Tabelas para o FitLife v4 Cloud

-- 1. Perfil do Usuário
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  age INTEGER,
  gender TEXT,
  height INTEGER,
  weight NUMERIC,
  activity_level TEXT,
  goal TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Água
CREATE TABLE IF NOT EXISTS water_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  time TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Treinos
CREATE TABLE IF NOT EXISTS workout_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  exercises JSONB NOT NULL,
  duration INTEGER NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Alimentação
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  meal TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  meal TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_meals_user_created_idx ON saved_meals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS food_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  serving_label TEXT NOT NULL DEFAULT '100g',
  serving_grams NUMERIC NOT NULL DEFAULT 100,
  calories_per_100g NUMERIC NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'custom',
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_library_user_name_idx ON food_library(user_id, name);

-- 5. Sono
CREATE TABLE IF NOT EXISTS sleep_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bedtime TEXT NOT NULL,
  wakeup TEXT NOT NULL,
  quality INTEGER NOT NULL,
  duration NUMERIC NOT NULL,
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Peso
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  body_fat NUMERIC,
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Medidas Corporais
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

-- 7. Fotos de Progresso
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

-- 8. Jejum
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  target_duration INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Metas Personalizadas
CREATE TABLE IF NOT EXISTS user_goals (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  water INTEGER,
  water_glasses INTEGER,
  glass_size INTEGER,
  workout_minutes INTEGER,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  sleep_hours INTEGER,
  weight_goal NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Conquistas Desbloqueadas
CREATE TABLE IF NOT EXISTS unlocked_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_date DATE NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 11. Hábitos Personalizados
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

-- 12. Registros dos Hábitos Personalizados
CREATE TABLE IF NOT EXISTS custom_habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES custom_habits ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

-- Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_habit_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (Apenas o dono pode ver/editar seus dados)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own water entries" ON water_entries;
DROP POLICY IF EXISTS "Users can manage their own workout entries" ON workout_entries;
DROP POLICY IF EXISTS "Users can manage their own food entries" ON food_entries;
DROP POLICY IF EXISTS "Users can manage their own saved meals" ON saved_meals;
DROP POLICY IF EXISTS "Users can manage their own food library" ON food_library;
DROP POLICY IF EXISTS "Users can manage their own sleep entries" ON sleep_entries;
DROP POLICY IF EXISTS "Users can manage their own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can manage their own body measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can manage their own progress photos" ON progress_photos;
DROP POLICY IF EXISTS "Users can manage their own fasting sessions" ON fasting_sessions;
DROP POLICY IF EXISTS "Users can manage their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can manage their own achievements" ON unlocked_achievements;
DROP POLICY IF EXISTS "Users can manage their own custom habits" ON custom_habits;
DROP POLICY IF EXISTS "Users can manage their own custom habit logs" ON custom_habit_logs;

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage their own water entries" ON water_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own workout entries" ON workout_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own food entries" ON food_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own saved meals" ON saved_meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own food library" ON food_library FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sleep entries" ON sleep_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own weight entries" ON weight_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own body measurements" ON body_measurements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own progress photos" ON progress_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own fasting sessions" ON fasting_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own goals" ON user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own achievements" ON unlocked_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own custom habits" ON custom_habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own custom habit logs" ON custom_habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. Catalogo oficial de alimentos
CREATE TABLE IF NOT EXISTS food_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  serving_label TEXT NOT NULL DEFAULT '100g',
  serving_grams NUMERIC NOT NULL DEFAULT 100,
  calories_per_100g NUMERIC NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  source_reference TEXT NOT NULL DEFAULT 'FitLife',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_catalog_name_idx ON food_catalog(name);
CREATE INDEX IF NOT EXISTS food_catalog_category_idx ON food_catalog(category);

ALTER TABLE food_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read food catalog" ON food_catalog;

CREATE POLICY "Authenticated users can read food catalog"
ON food_catalog
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS food_catalog_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID REFERENCES food_catalog(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (food_id, alias)
);

CREATE INDEX IF NOT EXISTS food_catalog_aliases_alias_idx ON food_catalog_aliases(alias);

ALTER TABLE food_catalog_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read food catalog aliases" ON food_catalog_aliases;

CREATE POLICY "Authenticated users can read food catalog aliases"
ON food_catalog_aliases
FOR SELECT
USING (auth.role() = 'authenticated');

ALTER TABLE food_entries
  ALTER COLUMN calories TYPE NUMERIC USING calories::NUMERIC,
  ALTER COLUMN protein TYPE NUMERIC USING protein::NUMERIC,
  ALTER COLUMN carbs TYPE NUMERIC USING carbs::NUMERIC,
  ALTER COLUMN fat TYPE NUMERIC USING fat::NUMERIC;

ALTER TABLE saved_meals
  ALTER COLUMN calories TYPE NUMERIC USING calories::NUMERIC,
  ALTER COLUMN protein TYPE NUMERIC USING protein::NUMERIC,
  ALTER COLUMN carbs TYPE NUMERIC USING carbs::NUMERIC,
  ALTER COLUMN fat TYPE NUMERIC USING fat::NUMERIC;

INSERT INTO food_catalog (
  slug,
  name,
  category,
  serving_label,
  serving_grams,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  source_reference
)
VALUES
  ('abacate-cru', 'Abacate cru', 'fruta', '100g', 100, 160, 2, 9, 15, 'Catalogo FitLife'),
  ('arroz-branco-cozido', 'Arroz branco cozido', 'carboidrato', '100g', 100, 128, 2.5, 28, 0.3, 'Catalogo FitLife'),
  ('arroz-integral-cozido', 'Arroz integral cozido', 'carboidrato', '100g', 100, 124, 2.6, 25.8, 1, 'Catalogo FitLife'),
  ('feijao-carioca-cozido', 'Feijao carioca cozido', 'leguminosa', '100g', 100, 76, 4.8, 13.6, 0.5, 'Catalogo FitLife'),
  ('feijao-preto-cozido', 'Feijao preto cozido', 'leguminosa', '100g', 100, 77, 4.5, 14, 0.5, 'Catalogo FitLife'),
  ('peito-frango-grelhado', 'Peito de frango grelhado', 'proteina', '100g', 100, 165, 31, 0, 3.6, 'Catalogo FitLife'),
  ('frango-desfiado', 'Frango desfiado', 'proteina', '100g', 100, 163, 31, 0, 3.1, 'Catalogo FitLife'),
  ('ovo-inteiro', 'Ovo inteiro', 'proteina', '100g', 100, 143, 13, 1.1, 9.5, 'Catalogo FitLife'),
  ('banana-prata', 'Banana prata', 'fruta', '100g', 100, 98, 1.3, 26, 0.1, 'Catalogo FitLife'),
  ('maca', 'Maca', 'fruta', '100g', 100, 52, 0.3, 14, 0.2, 'Catalogo FitLife'),
  ('mamao', 'Mamao', 'fruta', '100g', 100, 43, 0.5, 10.8, 0.3, 'Catalogo FitLife'),
  ('batata-doce-cozida', 'Batata doce cozida', 'carboidrato', '100g', 100, 76, 1.4, 17.7, 0.1, 'Catalogo FitLife'),
  ('batata-inglesa-cozida', 'Batata inglesa cozida', 'carboidrato', '100g', 100, 87, 1.9, 20, 0.1, 'Catalogo FitLife'),
  ('patinho-moido', 'Patinho moido', 'proteina', '100g', 100, 219, 26, 0, 12, 'Catalogo FitLife'),
  ('macarrao-cozido', 'Macarrao cozido', 'carboidrato', '100g', 100, 158, 5.8, 31, 0.9, 'Catalogo FitLife'),
  ('leite-integral', 'Leite integral', 'laticinio', '100ml', 100, 61, 3.2, 4.8, 3.3, 'Catalogo FitLife'),
  ('leite-desnatado', 'Leite desnatado', 'laticinio', '100ml', 100, 34, 3.4, 5, 0.1, 'Catalogo FitLife'),
  ('iogurte-natural-desnatado', 'Iogurte natural desnatado', 'laticinio', '100g', 100, 41, 4.5, 5.8, 0.2, 'Catalogo FitLife'),
  ('whey-protein', 'Whey protein', 'suplemento', '30g', 30, 400, 80, 8, 6, 'Catalogo FitLife'),
  ('aveia-em-flocos', 'Aveia em flocos', 'carboidrato', '100g', 100, 389, 16.9, 66.3, 6.9, 'Catalogo FitLife'),
  ('tilapia-grelhada', 'Tilapia grelhada', 'proteina', '100g', 100, 128, 26, 0, 2.7, 'Catalogo FitLife'),
  ('salmao-grelhado', 'Salmao grelhado', 'proteina', '100g', 100, 206, 22, 0, 12, 'Catalogo FitLife'),
  ('atum-em-agua', 'Atum em agua', 'proteina', '100g', 100, 116, 26, 0, 1, 'Catalogo FitLife'),
  ('brocolis-cozido', 'Brocolis cozido', 'legume', '100g', 100, 35, 2.4, 7.2, 0.4, 'Catalogo FitLife'),
  ('cenoura-crua', 'Cenoura crua', 'legume', '100g', 100, 41, 0.9, 10, 0.2, 'Catalogo FitLife'),
  ('pao-frances', 'Pao frances', 'padaria', '1 unidade', 50, 300, 8, 58, 3, 'Catalogo FitLife'),
  ('pao-integral', 'Pao integral', 'padaria', '2 fatias', 50, 247, 12, 41, 4.2, 'Catalogo FitLife'),
  ('tapioca-pronta', 'Tapioca pronta', 'carboidrato', '100g', 100, 130, 0.2, 32, 0.1, 'Catalogo FitLife'),
  ('cuscuz-milho-cozido', 'Cuscuz de milho cozido', 'carboidrato', '100g', 100, 112, 2.2, 25.3, 0.7, 'Catalogo FitLife'),
  ('queijo-mucarela', 'Queijo mucarela', 'laticinio', '1 fatia', 30, 300, 22, 3, 22, 'Catalogo FitLife'),
  ('queijo-minas-frescal', 'Queijo minas frescal', 'laticinio', '1 fatia', 30, 264, 17, 3.2, 20.2, 'Catalogo FitLife'),
  ('cafe-sem-acucar', 'Cafe sem acucar', 'bebida', '100ml', 100, 2, 0.1, 0.3, 0, 'Catalogo FitLife'),
  ('azeite-oliva', 'Azeite de oliva', 'gordura', '1 colher de sopa', 13, 884, 0, 0, 100, 'Catalogo FitLife'),
  ('pasta-amendoim', 'Pasta de amendoim', 'gordura', '1 colher de sopa', 15, 588, 25, 20, 50, 'Catalogo FitLife'),
  ('mandioca-cozida', 'Mandioca cozida', 'carboidrato', '100g', 100, 125, 0.6, 30, 0.3, 'Catalogo FitLife'),
  ('laranja-pera', 'Laranja pera', 'fruta', '100g', 100, 47, 0.9, 11.8, 0.1, 'Catalogo FitLife'),
  ('abacaxi', 'Abacaxi', 'fruta', '100g', 100, 50, 0.5, 13, 0.1, 'Catalogo FitLife'),
  ('granola', 'Granola', 'cereal', '40g', 40, 421, 9.8, 66.6, 12.3, 'Catalogo FitLife'),
  ('ricota', 'Ricota', 'laticinio', '50g', 50, 140, 12.6, 3.8, 8.1, 'Catalogo FitLife'),
  ('requeijao-cremoso', 'Requeijao cremoso', 'laticinio', '1 colher de sopa', 30, 257, 9.6, 4.1, 23, 'Catalogo FitLife')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  serving_label = EXCLUDED.serving_label,
  serving_grams = EXCLUDED.serving_grams,
  calories_per_100g = EXCLUDED.calories_per_100g,
  protein_per_100g = EXCLUDED.protein_per_100g,
  carbs_per_100g = EXCLUDED.carbs_per_100g,
  fat_per_100g = EXCLUDED.fat_per_100g,
  source_reference = EXCLUDED.source_reference,
  is_active = TRUE,
  updated_at = NOW();

WITH aliases(slug, alias) AS (
  VALUES
    ('abacate-cru', 'abacate'),
    ('abacate-cru', 'avocado'),
    ('arroz-branco-cozido', 'arroz'),
    ('arroz-branco-cozido', 'arroz branco'),
    ('arroz-integral-cozido', 'arroz integral'),
    ('feijao-carioca-cozido', 'feijao'),
    ('feijao-carioca-cozido', 'feijão'),
    ('feijao-carioca-cozido', 'feijao carioca'),
    ('feijao-preto-cozido', 'feijao preto'),
    ('feijao-preto-cozido', 'feijão preto'),
    ('peito-frango-grelhado', 'frango'),
    ('peito-frango-grelhado', 'peito de frango'),
    ('peito-frango-grelhado', 'frango grelhado'),
    ('frango-desfiado', 'frango desfiado'),
    ('ovo-inteiro', 'ovo'),
    ('banana-prata', 'banana'),
    ('maca', 'maca'),
    ('maca', 'maçã'),
    ('mamao', 'mamao'),
    ('mamao', 'mamão'),
    ('mamao', 'papaya'),
    ('batata-doce-cozida', 'batata doce'),
    ('batata-inglesa-cozida', 'batata'),
    ('batata-inglesa-cozida', 'batata inglesa'),
    ('patinho-moido', 'carne moida'),
    ('patinho-moido', 'carne moída'),
    ('patinho-moido', 'patinho'),
    ('macarrao-cozido', 'macarrao'),
    ('macarrao-cozido', 'macarrão'),
    ('leite-integral', 'leite'),
    ('leite-desnatado', 'leite desnatado'),
    ('iogurte-natural-desnatado', 'iogurte'),
    ('whey-protein', 'whey'),
    ('whey-protein', 'whey protein'),
    ('aveia-em-flocos', 'aveia'),
    ('tilapia-grelhada', 'tilapia'),
    ('tilapia-grelhada', 'tilápia'),
    ('salmao-grelhado', 'salmao'),
    ('salmao-grelhado', 'salmão'),
    ('atum-em-agua', 'atum'),
    ('brocolis-cozido', 'brocolis'),
    ('brocolis-cozido', 'brócolis'),
    ('cenoura-crua', 'cenoura'),
    ('pao-frances', 'pao frances'),
    ('pao-frances', 'pão francês'),
    ('pao-frances', 'paozinho'),
    ('pao-integral', 'pao integral'),
    ('pao-integral', 'pão integral'),
    ('tapioca-pronta', 'tapioca'),
    ('tapioca-pronta', 'beiju'),
    ('cuscuz-milho-cozido', 'cuscuz'),
    ('queijo-mucarela', 'mucarela'),
    ('queijo-mucarela', 'mussarela'),
    ('queijo-mucarela', 'muçarela'),
    ('queijo-minas-frescal', 'queijo minas'),
    ('cafe-sem-acucar', 'cafe'),
    ('cafe-sem-acucar', 'café'),
    ('cafe-sem-acucar', 'cafe preto'),
    ('azeite-oliva', 'azeite'),
    ('pasta-amendoim', 'pasta de amendoim'),
    ('pasta-amendoim', 'peanut butter'),
    ('mandioca-cozida', 'mandioca'),
    ('mandioca-cozida', 'aipim'),
    ('mandioca-cozida', 'macaxeira'),
    ('laranja-pera', 'laranja'),
    ('abacaxi', 'abacaxi'),
    ('granola', 'granola'),
    ('ricota', 'ricota'),
    ('requeijao-cremoso', 'requeijao'),
    ('requeijao-cremoso', 'requeijão')
)
INSERT INTO food_catalog_aliases (food_id, alias)
SELECT food_catalog.id, aliases.alias
FROM aliases
JOIN food_catalog ON food_catalog.slug = aliases.slug
ON CONFLICT (food_id, alias) DO NOTHING;
