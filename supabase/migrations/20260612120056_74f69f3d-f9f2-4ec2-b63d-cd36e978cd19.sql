drop policy if exists "im_sel" on public.internal_messages;
create policy "im_sel" on public.internal_messages
for select
to authenticated
using (
  author_id = auth.uid()
  or has_role(auth.uid(), 'admin')
  or has_role(auth.uid(), 'dyspozytor')
  or exists (
    select 1
    from public.message_recipients mr
    where mr.message_id = internal_messages.id
      and mr.user_id = auth.uid()
  )
);