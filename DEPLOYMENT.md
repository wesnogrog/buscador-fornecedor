# Deployment Guide: Buscador de Fornecedor

The site is a static React app. Cloudflare Pages builds and publishes it from the `main` branch. Login, data and email go through Supabase and Google. Everything runs on free plans.

```
GitHub (main) ──► Cloudflare Pages ──► site
      │
      └─► GitHub Actions: type check, tests and build
```

## Step 1: Local Development

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev                  # http://localhost:5173
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if scripts are blocked.

## Step 2: Cloudflare Pages

1. In the [Cloudflare Dashboard](https://dash.cloudflare.com), go to **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
2. Authorize GitHub and select the repository.
3. Use these settings:
   - **Project name:** `buscador-fornecedor`
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and deploy. No environment variable is needed: the public values are in `.env.production`.

Every push to `main` publishes the site again. `public/_redirects` sends every route to the React app.

After the first deploy, in Supabase > **Authentication** > **URL Configuration**:

- set the **Site URL** to the production URL;
- add the production URL to the **Redirect URLs**, keeping `http://localhost:5173` for development.

## Step 3: Supabase, Google Login and Gmail

Login and Gmail sending go through Supabase Auth, so the app has no Google variable of its own.

### 3.1 Create the Google OAuth client

1. In Google Cloud Console, use a project and enable the **Gmail API**. No billing account or free trial is needed.
2. Configure the OAuth consent screen as **Internal** and add the scope `https://www.googleapis.com/auth/gmail.send`.
3. Create an OAuth client of type **Web application**.
4. Add this authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

A Workspace administrator may need to approve the app.

### 3.2 Enable Google in Supabase

1. In **Authentication** > **Sign In / Providers**, enable **Google** and paste the client ID and secret.
2. In the same screen, disable **Email**: the app only logs in with Google.

### 3.3 Apply the database and deploy the functions

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy --use-api
```

Set these secrets in the Supabase Dashboard, under **Edge Functions** > **Secrets**: `GMAIL_ENCRYPTION_KEY` (a long random value), `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Pasting with Ctrl+V into a PowerShell `Read-Host` prompt stores a control character instead of the value, so prefer the Dashboard.

Changing `GMAIL_ENCRYPTION_KEY` later makes the saved credentials unreadable, and everyone must log in again.

### 3.4 Run the RLS tests

Paste `supabase/tests/rls_comportamento.test.sql` into the Supabase SQL Editor and run it. It simulates each kind of user and rolls everything back, so it leaves nothing in the database.

## Step 4: Finding Suppliers

When a search finds nothing, the **Buscar no Google Maps** button calls the `request-collection` function, which starts the `Scraper` workflow on GitHub Actions. It allows 20 collections in 24 hours. Two secrets connect them:

- In GitHub > **Settings** > **Secrets and variables** > **Actions**: `SUPABASE_SERVICE_KEY`, the Supabase secret key.
- In Supabase > **Edge Functions** > **Secrets**: `GITHUB_DISPATCH_TOKEN`, a GitHub fine-grained token limited to this repository, with the **Actions: Read and write** permission. It expires, so renew it before the date chosen on GitHub.

The scraper also runs on a PC with Google Chrome, useful if Google blocks GitHub's servers. See `scraper/README.md`.

```bash
cd scraper
npm install
cp .env.example .env   # fill in the Supabase URL and secret key
node main.js "buffet" "Campinas"
```

## Security

- The repository is public. Only public values may be committed: `.env.production` holds the Supabase URL and publishable key, and RLS protects the data.
- The secret key belongs only in `scraper/.env`, which git ignores. Never use it in a `VITE_` variable, because those are compiled into the site.
- The Google client secret and `GMAIL_ENCRYPTION_KEY` belong only in Supabase.

## Troubleshooting

| Problem | Where to look |
|---------|---------------|
| Site not updated | Cloudflare Pages > **Deployments** > build log |
| Failed check after a push | GitHub > **Actions** |
| Login returns to the wrong address | Supabase > **URL Configuration** |
| Email error "OAuth client was not found" | `GOOGLE_CLIENT_ID` secret in Supabase |
| Email error "client secret is invalid" | `GOOGLE_CLIENT_SECRET` secret in Supabase |
| Search finds nothing | Use **Buscar no Google Maps** on the site |
| Collection does not start | `GITHUB_DISPATCH_TOKEN` secret in Supabase, which may have expired |
| Collection fails right away | GitHub > **Actions** > **Scraper**, and the `SUPABASE_SERVICE_KEY` secret on GitHub |
| "O Google bloqueou a coleta" | Wait a few hours, or run the scraper on a PC |
