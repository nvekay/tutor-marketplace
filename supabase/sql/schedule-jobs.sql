-- Production scheduler: calls /api/cron/tick every 5 minutes (expire holds, reminders, completions, payouts).
-- Run once in the SQL editor of the production Supabase project, after replacing the two values below.
-- Not a migration: the URL and the secret differ per environment, and the secret belongs in Vault, not in git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://YOUR-APP.vercel.app', 'tick_url_base');
select vault.create_secret('THE SAME VALUE AS CRON_SECRET IN VERCEL', 'cron_secret');

select cron.schedule(
  'tutor-market-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url_base') || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Check it runs:  select * from cron.job_run_details order by start_time desc limit 5;
-- Responses:      select status_code, content from net._http_response order by created desc limit 5;
-- Stop it:        select cron.unschedule('tutor-market-tick');
