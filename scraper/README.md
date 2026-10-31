# Buscador de Fornecedor - Scraper

Google Maps supplier scraper for Agência Surtô. Extracts business contact information (name, domain, email, WhatsApp) without proxies or paid APIs.

## Language & Technology Choice

**Node.js with Puppeteer**

### Why Node.js?
- Lightweight and fast for CLI tools
- Excellent async/await for managing rate limits and delays
- Easy to deploy to serverless environments (Supabase Edge Functions future-proofing)

### Why Puppeteer?
- **Necessary for Google Maps**: Google Maps renders content with JavaScript, so a real browser is required
- **Proven & Maintained**: Puppeteer is the most popular headless browser automation library
- **Works without proxies**: Direct connections to Google Maps work with built-in delays
- **Rate limit friendly**: Supports 2-5 second delays between requests to avoid IP blocking
- **Customizable**: Easy to extract specific fields (email, WhatsApp, phone)

### Constraint: "No Chromium if avoidable"
While this project does use Chromium (via Puppeteer), it is unavoidable for scraping Google Maps which heavily relies on JavaScript rendering. This is the minimal viable approach that doesn't require proxies, paid APIs, or external services.

## Setup

### Prerequisites
- Node.js 16+ installed
- Google Chrome installed (the scraper uses the PC's own Chrome)
- `.env` file configured with Supabase credentials

### Installation

```bash
cd scraper
npm install
cp .env.example .env
# Edit .env with your Supabase URL and secret key
```

### Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | `https://project.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | `sb_secret_...` | Your Supabase secret key. RLS blocks every other key from writing suppliers. Keep it only in this PC's `.env` |
| `MAX_RESULTS` | No | `20` | Maximum suppliers per search (default: 20) |
| `SERVICE` | Yes | `plumber` | Type of business to search |
| `REGION` | Yes | `São Paulo` | Geographic region/city |
| `HEADLESS` | No | `true` | Run browser in headless mode (default: true) |
| `MAX_RETRIES` | No | `3` | Max retries on failure |
| `DELAY_MIN_MS` | No | `2000` | Minimum delay between requests (ms) |
| `DELAY_MAX_MS` | No | `5000` | Maximum delay between requests (ms) |

## Usage

### Run from environment variables
```bash
npm start
```

### Run with command-line arguments
```bash
npm start "electrician" "Brasília"
node main.js "plumber" "São Paulo"
```

### Search without saving
```bash
node main.js "plumber" "São Paulo" --dry-run
```

### Development mode (auto-reload)
```bash
npm run dev
```

## Output Format

Results are stored in Supabase with the following structure (Task 2):

```json
{
  "id": "uuid",
  "service": "plumber",
  "region": "São Paulo",
  "name": "João's Plumbing",
  "domain": "joao-encanador.com.br",
  "email": "contato@joao-encanador.com.br",
  "whatsapp": "5511999999999",
  "phone": "1133334444",
  "address": "Rua..., São Paulo, SP",
  "google_maps_url": "https://maps.google.com/...",
  "scraped_at": "2024-10-31T14:00:00Z"
}
```

## Implementation Roadmap

**Task 1 (This)**: Project skeleton and technology choice ✓
**Task 2**: Database schema, Supabase setup, core scraping logic
**Task 3**: Email & WhatsApp extraction, contact enrichment
**Task 4**: CLI interface, bulk operations, scheduling

## Known Limitations

1. **Google Maps Rate Limiting**: If IP is blocked, user must wait and retry. Built-in delays (2-5s) minimize this risk.
2. **Dynamic Content**: Puppeteer adds startup overhead, but is necessary for Google Maps.
3. **Data Extraction Accuracy**: Some businesses may not have public contact info visible on Google Maps.
4. **No Proxy Support**: Intentional per spec (zero-cost, simple). Relies on respectful rate limiting.

## Troubleshooting

### "Puppeteer: timeout of 30000ms"
- Google Maps may be throttling your IP. Wait before retrying.
- Ensure `DELAY_MIN_MS` and `DELAY_MAX_MS` are set reasonably (2000-5000ms).

### "No such file: /usr/bin/chromium-browser"
- Puppeteer should auto-download Chromium. If not:
  ```bash
  npm install puppeteer --force
  ```

### Browser launch fails
- Try disabling sandbox:
  ```bash
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm start
  ```

## Cost Analysis

- **Node.js**: Free (open source)
- **Puppeteer**: Free (open source)
- **Supabase**: Free tier supports this use case
- **Google Maps**: No API key required (scraping public info)
- **Total**: **$0/month** ✓

## References

- [Puppeteer Documentation](https://pptr.dev/)
- [Google Maps Terms of Service](https://policies.google.com/terms) (respect robots.txt and rate limits)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
