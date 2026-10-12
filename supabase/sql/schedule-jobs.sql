-- Production scheduler: pg_cron calls /api/cron/tick every 5 minutes (expire holds, reminders, completions, payouts).
-- Run once in the SQL editor of the production Supabase project, after setting the app URL below.
-- Not a migration: the URL differs per environment.
--
-- The CRON_SECRET never appears in SQL: add it in Integrations → Vault → Add new secret, name `cron_secret`,
-- value = the same CRON_SECRET as in Vercel. Until that secret exists, the job runs but sends nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://YOUR-APP.vercel.app', 'tick_url_base')
where not exists (select 1 from vault.secrets where name = 'tick_url_base');

-- Scheduling the same job name again replaces it
select cron.schedule(
  'tutor-market-tick',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url_base') || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret');
  $job$
);

-- Check it runs:  select * from cron.job_run_details order by start_time desc limit 5;
-- Responses:      select status_code, content from net._http_response order by created desc limit 5;
-- Stop it:        select cron.unschedule('tutor-market-tick');
