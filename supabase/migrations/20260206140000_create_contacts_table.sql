CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own contacts"
    ON public.contacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contacts"
    ON public.contacts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
    ON public.contacts
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
    ON public.contacts
    FOR DELETE
    USING (auth.uid() = user_id);
