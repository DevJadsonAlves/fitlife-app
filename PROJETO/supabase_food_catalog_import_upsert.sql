-- FitLife - Importacao em lote para food_catalog com UPSERT
-- Como usar (Supabase):
-- 1) Rode este arquivo no SQL Editor (cria a tabela de staging).
-- 2) No Table Editor, importe seu CSV para a tabela: staging_food_catalog_import.
-- 3) Rode novamente APENAS a secao "UPSERT para food_catalog".
-- 4) (Opcional) Rode a secao de limpeza da staging.

-- =========================================================
-- 1) Tabela de staging (colunas em TEXT para evitar falhas de import)
-- =========================================================
CREATE TABLE IF NOT EXISTS staging_food_catalog_import (
  slug TEXT,
  name TEXT,
  category TEXT,
  serving_label TEXT,
  serving_grams TEXT,
  calories_per_100g TEXT,
  protein_per_100g TEXT,
  carbs_per_100g TEXT,
  fat_per_100g TEXT,
  source_reference TEXT
);

-- =========================================================
-- 2) Checagens rapidas (opcional)
-- =========================================================
-- SELECT COUNT(*) AS total_linhas FROM staging_food_catalog_import;
--
-- SELECT slug, COUNT(*) AS repeticoes
-- FROM staging_food_catalog_import
-- GROUP BY slug
-- HAVING COUNT(*) > 1
-- ORDER BY repeticoes DESC, slug;
--
-- SELECT *
-- FROM staging_food_catalog_import
-- WHERE COALESCE(TRIM(slug), '') = ''
--    OR COALESCE(TRIM(name), '') = '';

-- =========================================================
-- 3) UPSERT para food_catalog
-- =========================================================
WITH cleaned AS (
  SELECT
    LOWER(TRIM(slug)) AS slug,
    TRIM(name) AS name,
    COALESCE(NULLIF(TRIM(category), ''), 'geral') AS category,
    COALESCE(NULLIF(TRIM(serving_label), ''), '100g') AS serving_label,

    CASE
      WHEN TRIM(COALESCE(serving_grams, '')) ~ '^-?\d+([.,]\d+)?$'
        THEN REPLACE(TRIM(serving_grams), ',', '.')::NUMERIC
      ELSE 100::NUMERIC
    END AS serving_grams,

    CASE
      WHEN TRIM(COALESCE(calories_per_100g, '')) ~ '^-?\d+([.,]\d+)?$'
        THEN REPLACE(TRIM(calories_per_100g), ',', '.')::NUMERIC
      ELSE 0::NUMERIC
    END AS calories_per_100g,

    CASE
      WHEN TRIM(COALESCE(protein_per_100g, '')) ~ '^-?\d+([.,]\d+)?$'
        THEN REPLACE(TRIM(protein_per_100g), ',', '.')::NUMERIC
      ELSE 0::NUMERIC
    END AS protein_per_100g,

    CASE
      WHEN TRIM(COALESCE(carbs_per_100g, '')) ~ '^-?\d+([.,]\d+)?$'
        THEN REPLACE(TRIM(carbs_per_100g), ',', '.')::NUMERIC
      ELSE 0::NUMERIC
    END AS carbs_per_100g,

    CASE
      WHEN TRIM(COALESCE(fat_per_100g, '')) ~ '^-?\d+([.,]\d+)?$'
        THEN REPLACE(TRIM(fat_per_100g), ',', '.')::NUMERIC
      ELSE 0::NUMERIC
    END AS fat_per_100g,

    COALESCE(NULLIF(TRIM(source_reference), ''), 'Importacao CSV') AS source_reference
  FROM staging_food_catalog_import
  WHERE COALESCE(TRIM(slug), '') <> ''
    AND COALESCE(TRIM(name), '') <> ''
),
normalized AS (
  SELECT
    slug,
    name,
    category,
    serving_label,
    GREATEST(serving_grams, 0.1) AS serving_grams,
    GREATEST(calories_per_100g, 0) AS calories_per_100g,
    GREATEST(protein_per_100g, 0) AS protein_per_100g,
    GREATEST(carbs_per_100g, 0) AS carbs_per_100g,
    GREATEST(fat_per_100g, 0) AS fat_per_100g,
    source_reference
  FROM cleaned
)
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
  source_reference,
  is_active,
  updated_at
)
SELECT
  slug,
  name,
  category,
  serving_label,
  serving_grams,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  source_reference,
  TRUE,
  NOW()
FROM normalized
ON CONFLICT (slug) DO UPDATE
SET
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

-- =========================================================
-- 4) Limpeza da staging (opcional)
-- =========================================================
-- TRUNCATE TABLE staging_food_catalog_import;

-- =========================================================
-- 5) Verificacao final (opcional)
-- =========================================================
-- SELECT COUNT(*) AS total_catalogo_ativo
-- FROM food_catalog
-- WHERE is_active = TRUE;
