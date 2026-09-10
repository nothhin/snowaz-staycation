-- Enforce the 24-hour unpaid deposit policy for databases where the original
-- cron migration has already been applied.
create or replace function public.expire_snowaz_deposit_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  update public.booking_requests
  set status = 'cancelled',
      cancellation_reason = 'Security deposit was not paid within 24 hours.',
      cancelled_at = now(),
      updated_at = now()
  where status in ('pending', 'contacted')
    and deposit_status = 'awaiting_payment'
    and deposit_token_expires_at <= now();
  get diagnostics expired_count = row_count;

  delete from public.snowaz_calendar_ranges r
  where r.source_kind = 'booking_request'
    and not exists (
      select 1 from public.booking_requests b
      where b.id = r.source_id and b.status not in ('cancelled', 'declined')
    );

  return expired_count;
end;
$$;

revoke all on function public.expire_snowaz_deposit_holds() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'snowaz-expire-deposit-holds';

    perform cron.schedule(
      'snowaz-expire-deposit-holds',
      '* * * * *',
      'select public.expire_snowaz_deposit_holds()'
    );
  end if;
end;
$$;
