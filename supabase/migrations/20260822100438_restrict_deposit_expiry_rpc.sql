create extension if not exists pg_cron;

-- Release unpaid booking holds after the 24-hour deposit window. Keep the
-- booking row as a cancelled audit record, but remove its calendar hold so
-- the dates become available again.
create or replace function public.expire_snowaz_deposit_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  with expired as (
    update public.booking_requests
    set status = 'cancelled',
        cancellation_reason = 'Security deposit was not paid within 24 hours.',
        cancelled_at = now(),
        updated_at = now()
    where status in ('pending', 'contacted')
      and deposit_status = 'awaiting_payment'
      and deposit_token_expires_at <= now()
    returning id
  )
  delete from public.snowaz_calendar_ranges r
  using expired
  where r.source_kind = 'booking_request'
    and r.source_id = expired.id;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_snowaz_deposit_holds() from public, anon, authenticated;

select cron.schedule(
  'snowaz-expire-deposit-holds',
  '* * * * *',
  'select public.expire_snowaz_deposit_holds()'
);
