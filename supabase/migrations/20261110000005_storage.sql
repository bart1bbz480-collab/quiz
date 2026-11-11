-- ============================================================
-- Migratie 5: Supabase Storage bucket en policies
-- ============================================================

-- Bucket aanmaken (public = false, bestanden vereisen authenticatie)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quiz-images',
  'quiz-images',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lezen: alle ingelogde gebruikers (interviewers + admins)
create policy "quiz-images: authenticated lezen"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quiz-images');

-- Uploaden: alleen admins
create policy "quiz-images: admin uploaden"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quiz-images'
    and (select public.is_admin())
  );

-- Updaten: alleen admins
create policy "quiz-images: admin updaten"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quiz-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'quiz-images'
    and (select public.is_admin())
  );

-- Verwijderen: alleen admins
create policy "quiz-images: admin verwijderen"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quiz-images'
    and (select public.is_admin())
  );
