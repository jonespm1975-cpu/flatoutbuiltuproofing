-- One active sponsor submission per contact email on an invite, allowing a resubmission after rejection.
create unique index if not exists sponsor_one_active_submission_per_invite_email
 on public.sponsor_logo_submissions (invite_id, lower(contact_email))
 where status in ('pending','approved');

alter table public.sponsor_logo_submissions
 add column if not exists owner_notification_status text not null default 'pending'
   check (owner_notification_status in ('pending','sent','failed')),
 add column if not exists owner_notified_at timestamptz,
 add column if not exists notification_error text;
