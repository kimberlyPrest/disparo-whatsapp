-- Function to safely increment the sent_messages counter
CREATE OR REPLACE FUNCTION increment_campaign_sent(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET sent_messages = COALESCE(sent_messages, 0) + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_campaign_sent(UUID) TO authenticated, service_role;
