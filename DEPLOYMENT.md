# Deployment Guide: Buscador de Fornecedor

This guide explains how to deploy the Buscador de Fornecedor React application to Cloudflare Pages with automatic CI/CD via GitHub Actions.

## Architecture Overview

```
┌─────────────────┐
│  Git Repository │
│   (main branch) │
└────────┬────────┘
         │
         ├─ GitHub Actions (CI/CD)
         │  ├─ npm ci
         │  ├─ npm run build
         │  └─ Deploy to Cloudflare Pages
         │
         └─► Cloudflare Pages
            ├─ Automatic deployments
            ├─ Global CDN
            └─ Free HTTPS
```

## Prerequisites

### Local Machine Setup
- **Node.js**: 18+ (required for development)
- **npm**: 9+ (included with Node.js)
- **Git**: Latest version

### Cloudflare Account
- Cloudflare account (free tier supported)
- Project created in Cloudflare Pages
- API token for CI/CD integration

### GitHub
- Repository with main branch
- GitHub Secrets configured for deployment

### Environment Credentials
Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Step 1: Local Development Setup

### 1.1 Clone the Repository
```bash
git clone <repository-url>
cd buscador-fornecedor
```

### 1.2 Install Dependencies
```bash
npm install
```

### 1.3 Configure Environment Variables
```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

**Required values for development:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 1.4 Verify Build Works Locally
```bash
# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Verify build output
ls -la dist/
```

Expected output:
- `dist/index.html` - Main HTML entry point
- `dist/assets/` - JavaScript and CSS bundles
- All assets properly bundled and minified

## Step 2: Cloudflare Pages Setup

### 2.1 Create Cloudflare Pages Project

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** > **Create a project**
3. Select **Connect to Git**
4. Authorize GitHub and select your repository
5. Choose project name: `buscador-fornecedor`

### 2.2 Build Configuration

In Cloudflare Pages project settings:

**Build command:** `npm run build`

**Build output directory:** `dist`

**Environment variables:** Do NOT set here in Cloudflare UI. Instead, use GitHub Secrets (see Step 3).

### 2.3 Test Initial Deployment

1. Cloudflare will automatically detect changes to main branch
2. First deployment will use the build command from Step 2.2
3. Check deployment logs in Cloudflare Pages dashboard
4. Verify domain: `https://buscador-fornecedor.pages.dev`

## Step 3: GitHub Actions & Secrets Setup

### 3.1 Create Cloudflare API Token

1. Log in to Cloudflare Dashboard
2. Navigate to **Profile** > **API Tokens**
3. Create new token with permissions:
   - Account.Cloudflare Pages:Edit
   - Account.Cloudflare Pages:Read
4. Copy the token (you'll need it in next step)

### 3.2 Create GitHub Secrets

In your GitHub repository:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Create the following secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token from Step 3.1 |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

**Finding your Account ID:**
- Cloudflare Dashboard > Sidebar > Account
- Copy the Account ID displayed

### 3.3 Verify GitHub Actions Workflow

The workflow file `.github/workflows/deploy.yml` is included and will:

1. **Trigger on push to main branch**
2. **Run on every commit:**
   - Check out code
   - Install dependencies
   - Run TypeScript type checking
   - Run tests (non-blocking)
   - Build the app
3. **Deploy to Cloudflare Pages** (only on main branch)
4. **Comment on PRs** with build status

## Step 4: Supabase, Google Login and Gmail

Login and Gmail sending go through Supabase Auth, so the app has no Google variable of its own.

### 4.1 Create the Google OAuth client

1. In Google Cloud Console, create a project and enable the **Gmail API**. No billing account is needed.
2. Configure the OAuth consent screen as **Internal** and add the scope `https://www.googleapis.com/auth/gmail.send`.
3. Create an OAuth client of type **Web application**.
4. Add this authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

A Workspace administrator may need to approve the app.

### 4.2 Enable Google in Supabase

1. In Authentication > Providers, enable **Google** and paste the client ID and secret.
2. In the same screen, disable **Email**: the app only logs in with Google.
3. In Authentication > URL Configuration, set the Site URL to the production URL and add `http://localhost:5173` to the redirect URLs.

### 4.3 Apply the database and deploy the functions

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set GMAIL_ENCRYPTION_KEY=<long-random-value> GOOGLE_CLIENT_ID=<client-id> GOOGLE_CLIENT_SECRET=<client-secret>
supabase functions deploy send-email
supabase functions deploy save-gmail-credential
```

Changing `GMAIL_ENCRYPTION_KEY` later makes the saved credentials unreadable, and everyone must log in again.

### 4.4 Run the RLS tests

Paste `supabase/tests/rls_comportamento.test.sql` into the Supabase SQL Editor and run it. It simulates each kind of user and rolls everything back, so it leaves nothing in the database.

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain to Cloudflare Pages

1. In Cloudflare Pages project > **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `buscador.example.com`)
4. Follow DNS configuration instructions

### 5.2 Update Authorized Redirect URIs

Update Google OAuth authorized redirect URIs with your custom domain:
```
https://buscador.example.com/auth/callback
https://buscador.example.com/
```

## Step 6: SPA Routing Configuration

Cloudflare Pages automatically handles SPA routing with a `_redirects` file.

The app uses React Router with the following routes:
```
/ → NovoPedido (home)
/novo-pedido → NovoPedido
/resultados → Resultados
/mensagem → Mensagem
/envio → Envio
/pedidos → Pedidos
```

All 404s automatically redirect to `index.html` for client-side routing.

### 6.1 Verify SPA Routing

Test in production:
```bash
curl -I https://buscador-fornecedor.pages.dev/resultados
# Should return 200, not 404
```

## Step 7: CORS Configuration

### 7.1 Supabase CORS Headers

Ensure Supabase project allows requests from your deployment domain:

1. Supabase Dashboard > **Settings** > **API** > **CORS**
2. Add allowed origins:

```
http://localhost:5173
http://localhost:5173/
https://buscador-fornecedor.pages.dev
https://buscador-fornecedor.pages.dev/
https://your-custom-domain.com
https://your-custom-domain.com/
```

### 7.2 Test CORS

In browser console:
```javascript
// Should work without CORS errors
fetch('https://your-supabase-url/rest/v1/', {
  headers: {
    'apikey': 'your-anon-key',
  }
})
```

## Step 8: Continuous Deployment Workflow

### 8.1 Making Changes

Standard development workflow:
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### 8.2 GitHub Actions

When pushing to feature branches:
- GitHub Actions runs: **build + test only**
- No deployment to Cloudflare Pages
- Comments on PR with build status

### 8.3 Deploy to Production

When PR is merged to main:
```bash
# GitHub Actions automatically:
# 1. Builds the app
# 2. Deploys to Cloudflare Pages
# 3. App is live at production URL
```

View deployment in:
- Cloudflare Dashboard > Pages > Deployments
- GitHub Actions > Workflow runs

## Troubleshooting

### Issue: Build fails with "Command failed with exit code"

**Solution:** Check GitHub Actions logs
1. Go to **Actions** tab in GitHub
2. Click the failed workflow
3. Expand **Build and Deploy** step
4. Check error output

Common causes:
- Missing environment variables in GitHub Secrets
- TypeScript compilation errors
- Missing dependencies in package.json

### Issue: Deployment succeeds but app shows blank page

**Possible causes:**
- Missing environment variables at runtime
- Browser cache issue
- Invalid Supabase credentials

**Debug:**
```javascript
// In browser console
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### Issue: OAuth login fails with CORS error

**Solution:**
1. Check Google OAuth redirect URIs match exactly
2. Verify Supabase CORS configuration
3. Check browser console for specific error

### Issue: Form data not saving

**Possible causes:**
- Supabase authentication not working
- RLS policies blocking writes
- Missing environment variables

**Debug:**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/fornecedores?limit=1
```

## Performance & Monitoring

### 8.1 Monitor Deployments

Cloudflare Pages dashboard shows:
- Deployment history
- Build logs
- Real-time page analytics
- Performance metrics

### 8.2 Check Page Speed

Use tools to monitor performance:
- [PageSpeed Insights](https://pagespeed.web.dev)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- Cloudflare Analytics

### 8.3 View Real-time Logs

```bash
# Stream deployment logs
npm install -g @cloudflare/wrangler
wrangler pages deployment list --project-name=buscador-fornecedor
```

## Security Checklist

- [ ] Environment variables NOT committed to git
- [ ] GitHub Secrets properly configured
- [ ] Google OAuth credentials kept secret
- [ ] Supabase API key limited to anonymous scope
- [ ] Custom domain has HTTPS enabled (automatic with Cloudflare)
- [ ] Rate limiting configured if needed
- [ ] CORS properly restricted

## Next Steps

1. **Monitor deployments** in GitHub Actions
2. **Test OAuth flow** in production
3. **Verify data persistence** with Supabase
4. **Set up alerts** for deployment failures
5. **Configure custom domain** when ready
6. **Scale resources** if needed

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [React Router Documentation](https://reactrouter.com/)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions:
1. Check GitHub Actions logs for build errors
2. Review Cloudflare Pages deployment logs
3. Check browser console for runtime errors
4. Verify environment variables in GitHub Secrets
5. Test locally with `npm run build && npm run preview`
