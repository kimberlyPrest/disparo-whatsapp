-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update campaigns status check constraint to include 'processing' and 'pending' as requested in User Story
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('scheduled', 'pending', 'active', 'processing', 'finished'));

-- Schedule the job to run every minute
-- We use the Anonymous Key provided in the project context to authorize the call
SELECT cron.schedule(
    'process-campaign-queue-job',
    '* * * * *',
    $$
    SELECT
      net.http_post(
          url:='https://aqmsvswynbtyweeqswyt.supabase.co/functions/v1/process-campaign-queue',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbXN2c3d5bmJ0eXdlZXFzd3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTg3NDYsImV4cCI6MjA4NTg5NDc0Nn0.1nzL4SUlB1Kf-VVJkwk6Ulfx3UXUGYN-SLZFRwaxZIY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
