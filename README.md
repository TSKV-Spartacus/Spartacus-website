# T.S.K.V. Spartacus Website

Official website for T.S.K.V. Spartacus — Tilburg's student strength sports association. Built with [Astro](https://astro.build) and deployed on [Cloudflare Workers](https://workers.cloudflare.com).

---

## Prerequisites

You need **Node.js** installed before anything else.

1. Download the **LTS** version from [https://nodejs.org](https://nodejs.org)
2. Run the installer (default options are fine)
3. **Close and reopen your terminal** after installing so `npm` is recognized

Verify it worked:
```
node --version
npm --version
```

---

## Local Setup

Clone the repo and install dependencies (this is the equivalent of a Python venv — run once):

```bash
git clone https://github.com/TSKV-Spartacus/Spartacus-website
cd Spartacus-website
npm install
```

---

## Dev Commands

Run these from the root of the project:

| Command           | What it does                                        |
| :---------------- | :-------------------------------------------------- |
| `npm run dev`     | Start local dev server at **http://localhost:4321** |
| `npm run build`   | Build the production site to `./dist/`              |
| `npm run preview` | Preview the production build locally                |
| `npm run deploy`  | Build and deploy to Cloudflare Workers              |

**To start developing:**
```bash
npm run dev
```
Then open [http://localhost:4321](http://localhost:4321) in your browser. Changes to files in `src/` hot-reload automatically.

---

## Project Structure

```
Spartacus-website/
├── public/               # Static assets (images, fonts, documents)
│   └── images/           # All website images and logos
├── src/
│   ├── components/       # Reusable Astro components (Header, Footer, etc.)
│   ├── pages/            # Website pages — each file = a route
│   │   ├── index.astro           → /
│   │   ├── about.astro           → /about
│   │   ├── strenghtsports.astro  → /strenghtsports
│   │   ├── committee.astro       → /committee
│   │   ├── contact.astro         → /contact
│   │   └── strenghtsports/
│   │       └── powerlifting.astro → /strenghtsports/powerlifting
│   ├── styles/
│   │   ├── global.css            # CSS variables, resets, shared utilities
│   │   ├── Components/           # Header and Footer styles
│   │   └── pages/                # Per-page stylesheets
│   └── content/          # Markdown blog/news content
├── package.json
├── astro.config.mjs      # Astro configuration
└── wrangler.json         # Cloudflare Workers config
```

---

## Deploying to Cloudflare

You need a [Cloudflare account](https://dash.cloudflare.com/sign-up) and to be logged in via Wrangler:

```bash
npx wrangler login
npm run deploy
```

---

## Tech Stack

- **Framework**: [Astro 5](https://astro.build) — static site generator
- **Hosting**: Cloudflare Workers (static assets)
- **Fonts**: Bebas Neue (headings), Montserrat (body) via Google Fonts
- **Icons**: Font Awesome (loaded via CDN in Header)
- **Colors**: `#ba131a` red, `#37001b` burgundy, `#e7c55e` yellow
