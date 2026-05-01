-- ============================================================================
-- client_intakes — onboarding survey filled by client after invite acceptance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_intakes (
  client_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth          DATE,
  height_cm              INTEGER,
  weight_kg              NUMERIC(5,1),
  primary_goal           TEXT,
  experience_level       TEXT,
  training_days_per_week INTEGER,
  equipment_access       TEXT,
  injuries               TEXT,
  dietary_notes          TEXT,
  completed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_primary_goal CHECK (primary_goal IS NULL OR primary_goal IN (
    'lose_fat', 'build_muscle', 'get_stronger', 'general_fitness', 'sport_specific'
  )),
  CONSTRAINT valid_experience_level CHECK (experience_level IS NULL OR experience_level IN (
    'beginner', 'intermediate', 'advanced'
  )),
  CONSTRAINT valid_equipment_access CHECK (equipment_access IS NULL OR equipment_access IN (
    'full_gym', 'home_gym', 'dumbbells_only', 'minimal'
  )),
  CONSTRAINT valid_training_days CHECK (
    training_days_per_week IS NULL OR (training_days_per_week BETWEEN 1 AND 7)
  ),
  CONSTRAINT valid_height CHECK (height_cm IS NULL OR (height_cm BETWEEN 100 AND 250)),
  CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 30 AND 300))
);

CREATE INDEX IF NOT EXISTS idx_client_intakes_completed
  ON public.client_intakes(completed_at DESC);

DROP TRIGGER IF EXISTS set_client_intakes_updated_at ON public.client_intakes;
CREATE TRIGGER set_client_intakes_updated_at
  BEFORE UPDATE ON public.client_intakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own intake"
  ON public.client_intakes FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches read client intakes"
  ON public.client_intakes FOR SELECT
  USING (
    client_id IN (
      SELECT cc.client_id
      FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.status IN ('active', 'paused')
    )
  );

ANALYZE public.client_intakes;
