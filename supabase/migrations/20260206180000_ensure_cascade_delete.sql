-- Add DELETE policy for campaigns so users can delete their own campaigns
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure campaign_messages has ON DELETE CASCADE on campaign_id
-- This allows messages to be automatically deleted when the parent campaign is deleted
ALTER TABLE public.campaign_messages
DROP CONSTRAINT IF EXISTS campaign_messages_campaign_id_fkey;

ALTER TABLE public.campaign_messages
ADD CONSTRAINT campaign_messages_campaign_id_fkey
FOREIGN KEY (campaign_id)
REFERENCES public.campaigns(id)
ON DELETE CASCADE;
