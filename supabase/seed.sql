-- ============================================================
-- Seed: voorbeeldquiz voor development/testing
-- ============================================================
-- Voer dit uit NADAT je de eerste admin hebt aangemaakt.
-- Stap 1: stel een toegangscode in via de admin-interface of:
--   select set_access_code('test123');

-- Voorbeeldquiz aanmaken
insert into public.quizzes (
  id, title, version, status,
  campaign_url,
  thanks_text_nl, thanks_text_fr, thanks_text_en
) values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Testquiz Marktonderzoek',
  1,
  'active',
  'https://example.com/campagne',
  'Bedankt voor je medewerking!',
  'Merci de votre participation !',
  'Thank you for your participation!'
);

-- Vraag 1: meerkeuze
insert into public.questions (id, quiz_id, position, type, text_nl, text_fr, text_en)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  1,
  'multiple_choice',
  'Hoe vaak bezoek je dit winkelcentrum per maand?',
  'Combien de fois visitez-vous ce centre commercial par mois ?',
  'How often do you visit this shopping centre per month?'
);

insert into public.options (question_id, position, label_nl, label_fr, label_en)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 1, 'Minder dan 1 keer', 'Moins d''une fois', 'Less than once'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 2, '1–2 keer', '1–2 fois', '1–2 times'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 3, '3–5 keer', '3–5 fois', '3–5 times'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 4, 'Meer dan 5 keer', 'Plus de 5 fois', 'More than 5 times');

-- Vraag 2: ja/nee/weet ik niet
insert into public.questions (id, quiz_id, position, type, text_nl, text_fr, text_en)
values (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  2,
  'yes_no_unknown',
  'Ben je tevreden over het aanbod?',
  'Êtes-vous satisfait(e) de l''offre ?',
  'Are you satisfied with the selection?'
);

insert into public.options (question_id, position, label_nl, label_fr, label_en)
values
  ('bbbbbbbb-0000-0000-0000-000000000002', 1, 'Ja', 'Oui', 'Yes'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 2, 'Nee', 'Non', 'No'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 3, 'Weet ik niet', 'Je ne sais pas', 'I don''t know');

-- Vraag 3: meerkeuze
insert into public.questions (id, quiz_id, position, type, text_nl, text_fr, text_en)
values (
  'bbbbbbbb-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001',
  3,
  'multiple_choice',
  'Wat is je voornaamste reden om hier te winkelen?',
  'Quelle est votre principale raison de faire vos achats ici ?',
  'What is your main reason for shopping here?'
);

insert into public.options (question_id, position, label_nl, label_fr, label_en)
values
  ('bbbbbbbb-0000-0000-0000-000000000003', 1, 'Ligging', 'Emplacement', 'Location'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 2, 'Aanbod', 'Offre', 'Selection'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 3, 'Prijs', 'Prix', 'Price'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 4, 'Sfeer', 'Ambiance', 'Atmosphere'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 5, 'Anders', 'Autre', 'Other');
