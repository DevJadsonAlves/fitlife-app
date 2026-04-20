-- Alimentacao 2.0 - favoritos e biblioteca de alimentos no Supabase
-- Rode este arquivo no SQL Editor do Supabase se as tabelas ainda nao existirem.

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

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved meals" ON saved_meals;

CREATE POLICY "Users can manage their own saved meals"
ON saved_meals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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

ALTER TABLE food_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own food library" ON food_library;

CREATE POLICY "Users can manage their own food library"
ON food_library
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
