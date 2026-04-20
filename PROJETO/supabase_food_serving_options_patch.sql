-- FitLife - Patch para medidas por alimento (estilo FatSecret)
-- Execute este SQL no Supabase para habilitar `serving_options` nas tabelas de alimentos.
-- A coluna armazena JSON no formato:
-- [
--   { "label": "1 unidade media", "grams": 120 },
--   { "label": "1 colher sopa", "grams": 15 }
-- ]

ALTER TABLE food_library
ADD COLUMN IF NOT EXISTS serving_options JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE food_catalog
ADD COLUMN IF NOT EXISTS serving_options JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Opcional: ajuda consultas futuras por medidas em JSON.
CREATE INDEX IF NOT EXISTS food_library_serving_options_gin
ON food_library
USING GIN (serving_options);

CREATE INDEX IF NOT EXISTS food_catalog_serving_options_gin
ON food_catalog
USING GIN (serving_options);
