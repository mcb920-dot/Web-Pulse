# Web Pulse ⚡

AI-powered local business intelligence tool. Find prospects, audit sites, analyze competitors.

## Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/web-pulse.git
cd web-pulse
npm install
```

### 2. Environment Variables
In Vercel dashboard, add these environment variables:
```
GOOGLE_PLACES_API_KEY=your_google_places_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Deploy to Vercel
```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo directly in the Vercel dashboard.

## Local Development
```bash
vercel dev
```
This runs both the React frontend and the API routes locally.

## Stack
- React + Vite (frontend)
- Vercel Serverless Functions (API proxy)
- Google Places API (business data)
- Claude Sonnet (AI analysis)

## Roadmap
- [x] Prospect Finder
- [ ] Site Audit
- [ ] Competitor Intel  
- [ ] Client Reports
