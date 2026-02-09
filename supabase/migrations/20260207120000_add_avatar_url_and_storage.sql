-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create avatar bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing of avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar images are publicly accessible.'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible."
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'avatars' );
    END IF;
END $$;

-- Policy to allow authenticated users to upload their own avatar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own avatar.'
    ) THEN
        CREATE POLICY "Users can upload their own avatar."
        ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );
    END IF;
END $$;

-- Policy to allow authenticated users to update their own avatar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own avatar.'
    ) THEN
        CREATE POLICY "Users can update their own avatar."
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'avatars' AND auth.uid() = owner );
    END IF;
END $$;

-- Policy to allow authenticated users to delete their own avatar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own avatar.'
    ) THEN
        CREATE POLICY "Users can delete their own avatar."
        ON storage.objects FOR DELETE
        USING ( bucket_id = 'avatars' AND auth.uid() = owner );
    END IF;
END $$;
