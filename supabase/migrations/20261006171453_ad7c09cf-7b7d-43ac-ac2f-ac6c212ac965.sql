CREATE TABLE public.assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 254 AND email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  locale text NOT NULL CHECK (char_length(locale) <= 16),
  role text NOT NULL CHECK (role IN ('manager','engineer')),
  team_size text NOT NULL CHECK (team_size IN ('lt5','5to15','gt15')),
  service_type text NOT NULL CHECK (service_type IN ('internal','external','hybrid')),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) = 20),
  scores jsonb NOT NULL,
  consent_contact boolean NOT NULL CHECK (consent_contact = true),
  consent_marketing boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL CHECK (char_length(consent_version) <= 32),
  consent_at timestamptz NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  app_version text NOT NULL CHECK (char_length(app_version) <= 32)
);
GRANT ALL ON public.assessment_submissions TO service_role;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;