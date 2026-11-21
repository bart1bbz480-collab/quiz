-- ============================================================
-- Migratie 9: Apparaatnamen
-- Elk kiosk-apparaat kan een herkenbare naam krijgen.
-- Naam wordt opgeslagen per device_id (UUID uit localStorage).
-- ============================================================

CREATE TABLE public.device_names (
  device_id  text        PRIMARY KEY,
  name       text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_names ENABLE ROW LEVEL SECURITY;

-- Iedereen kan lezen (admin-overzicht + apparaat zelf)
CREATE POLICY "device_names_select" ON public.device_names
  FOR SELECT USING (true);

-- Anonieme kiosken mogen hun eigen naam instellen
CREATE POLICY "device_names_insert" ON public.device_names
  FOR INSERT WITH CHECK (true);

CREATE POLICY "device_names_update" ON public.device_names
  FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON public.device_names TO anon, authenticated;
