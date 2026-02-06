DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'status') THEN
        ALTER TABLE public.contacts ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
END $$;
