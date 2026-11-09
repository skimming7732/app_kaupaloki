-- Keep UUIDs for relationships and give each movement a persistent statement code.
ALTER TABLE public.capital_movimientos
  ADD COLUMN numero bigint GENERATED ALWAYS AS IDENTITY;

ALTER TABLE public.capital_movimientos
  ADD COLUMN codigo text GENERATED ALWAYS AS (
    'CAP-' || lpad(numero::text, greatest(6, length(numero::text)), '0')
  ) STORED NOT NULL UNIQUE;
