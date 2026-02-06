-- Update contacts table with new status column
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update campaigns table with new columns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS config JSONB,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- Rename existing columns to match requirements
ALTER TABLE public.campaigns RENAME COLUMN messages_sent TO sent_messages;
ALTER TABLE public.campaigns RENAME COLUMN scheduled_for TO scheduled_at;

-- Create campaign_messages table
CREATE TABLE IF NOT EXISTS public.campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Enable RLS for campaign_messages
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_messages
-- Access control based on the ownership of the related campaign_id

-- SELECT: Users can view messages of their own campaigns
CREATE POLICY "Users can view their own campaign messages"
    ON public.campaign_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- INSERT: Users can insert messages to their own campaigns
CREATE POLICY "Users can insert their own campaign messages"
    ON public.campaign_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- UPDATE: Users can update messages of their own campaigns
CREATE POLICY "Users can update their own campaign messages"
    ON public.campaign_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- DELETE: Users can delete messages of their own campaigns
CREATE POLICY "Users can delete their own campaign messages"
    ON public.campaign_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );
