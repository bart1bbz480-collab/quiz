# Straatinterview Quiz App

PWA voor marktonderzoek op straat. Interviewers nemen enquêtes af op tablet of smartphone; de admin beheert vragenlijsten en bekijkt resultaten.

---

## Snelle start

### 1. Dependencies installeren

```bash
npm install
```

### 2. Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project**
2. Kies een naam, wachtwoord en regio (dichtstbijzijnde = beste latency)
3. Wacht tot het project klaar is (~1 minuut)

### 3. Migrations uitvoeren

Ga in het Supabase-dashboard naar **SQL Editor** en voer de migrations **in volgorde** uit:

| Bestand | Inhoud |
|---|---|
| `supabase/migrations/20261110000001_initial_schema.sql` | Tabellen, indexen, updated_at trigger |
| `supabase/migrations/20261110000002_triggers.sql` | Validatietriggers (max. 10 vragen, vergrendeling) |
| `supabase/migrations/20261110000003_rls.sql` | Row Level Security policies |
| `supabase/migrations/20261110000004_rpc.sql` | RPC-functies |
| `supabase/migrations/20261110000005_storage.sql` | Storage bucket + policies |

### 4. Eerste admin aanmaken

1. Ga naar **Authentication → Users → Add user**
2. Vul e-mail + wachtwoord in → **Create user**
3. Kopieer het `user_id` (UUID) van de nieuwe gebruiker
4. Ga naar **SQL Editor** en voer uit:
   ```sql
   insert into public.admins (user_id) values ('<plak-user-id-hier>');
   ```

### 5. Toegangscode instellen

In de SQL Editor (of later via de admin-interface):
```sql
select set_access_code('kieseen-veilige-code');
```

### 6. Testdata laden (optioneel)

```sql
-- Inhoud van supabase/seed.sql plakken en uitvoeren
```

### 7. Omgevingsvariabelen instellen

```bash
cp .env.local.example .env.local
```

Vul in `.env.local` de waarden in van **Settings → API** in het Supabase-dashboard:
- `VITE_SUPABASE_URL` → Project URL
- `VITE_SUPABASE_ANON_KEY` → `anon` / `public` key

### 8. App starten

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

- Interviewer-login: `/`
- Admin-login: `/admin`

---

## Deployment

Bouw de app:
```bash
npm run build
```

De `dist/`-map kan gedeployd worden op **Netlify**, **Vercel** of **Cloudflare Pages** (gratis tiers, HTTPS verplicht voor PWA).

### Netlify (aanbevolen)

1. Push de code naar GitHub
2. Ga naar [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Stel in:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Voeg omgevingsvariabelen toe onder **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy — de `netlify.toml` zorgt voor correcte SPA-routing

### Vercel

1. Push naar GitHub → importeer op [vercel.com](https://vercel.com)
2. Framework: **Vite** (auto-detected)
3. Voeg dezelfde omgevingsvariabelen toe
4. De `vercel.json` zorgt voor SPA-routing

### Cloudflare Pages

1. Ga naar **Pages → Create a project → Connect to Git**
2. Build command: `npm run build`, output: `dist`
3. Voeg omgevingsvariabelen toe
4. Voeg een `_redirects` bestand toe in `public/`:
   ```
   /* /index.html 200
   ```

**Vergeet nooit** de omgevingsvariabelen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in te stellen in het hosting-dashboard.

---

## Supabase gratis tier — belangrijk

> De gratis Supabase-tier **pauzeert na ~1 week zonder activiteit**.  
> Als interviewers de foutmelding "Verbinding mislukt" zien, ga dan naar [supabase.com/dashboard](https://supabase.com/dashboard), open het project en klik **Restore project**.

---

## Projectstructuur

```
src/
├─ app/              # Router, providers
├─ features/
│  ├─ auth/          # Interviewer-login, admin-login
│  ├─ install/       # PWA-installatieuitleg (iOS/Android)
│  ├─ interviewer/   # Startscherm
│  ├─ survey/        # Enquête-flow (taalkeuze → vragen → bedankpagina)
│  └─ admin/         # Vragenlijstbeheer, resultaten, instellingen
├─ lib/
│  ├─ supabase.ts    # Supabase-client + types
│  ├─ db.ts          # Dexie (IndexedDB) schema + helpers
│  ├─ sync.ts        # Wachtrij + synchronisatie
│  ├─ image.ts       # Afbeelding verkleinen, uploaden, cachen
│  ├─ results.ts     # Resultaatberekening
│  └─ utils.ts       # cn() helper
├─ i18n/             # Vaste teksten NL/FR/EN voor enquête
├─ types/            # Gedeelde TypeScript-types + Zod-schema's
└─ theme.ts          # Huisstijl (kleuren, fonts) — fase 7

supabase/
├─ migrations/       # SQL in volgorde uitvoeren
└─ seed.sql          # Testdata

public/icons/        # PWA-iconen (placeholder, vervangen in fase 7)
scripts/
└─ generate-icons.mjs  # npm run icons — genereert placeholder-iconen
```

---

## Iconen vervangen

De huidige iconen zijn placeholders. Om echte iconen te genereren:
1. Pas het design aan in `scripts/generate-icons.mjs`
2. Run `npm run icons`

Of vervang de PNG-bestanden in `public/icons/` handmatig.

---

## Bouwvolgorde

| Fase | Inhoud | Status |
|---|---|---|
| 0 | Fundament (Vite, router, PWA, Supabase-migrations, Dexie) | ✅ Klaar |
| 1 | Admin vragenlijstbeheer | ✅ Klaar |
| 2 | Interviewer + enquête-flow | ✅ Klaar |
| 3 | Offline + sync | ✅ Klaar |
| 4 | Resultaten | ✅ Klaar |
| 5 | Export (Excel, CSV, PDF) | ✅ Klaar |
| 6 | Oplevering + tests | ✅ Klaar |
| 7 | Huisstijl via theme.ts | 🔜 Later |
