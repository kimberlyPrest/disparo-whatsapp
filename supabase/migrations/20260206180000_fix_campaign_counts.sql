-- Migration to correct sent_messages count for existing campaigns
-- This ensures that campaigns marked as finished but showing 0/N reflect the real number of sent messages

UPDATE campaigns c
SET sent_messages = (
  SELECT count(*)
  FROM campaign_messages cm
  WHERE cm.campaign_id = c.id
  AND cm.status = 'sent'
);
