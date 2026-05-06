# Nursing Residency Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack nursing residency job tracker that scrapes five Bay Area hospitals every 30 minutes via GitHub Actions, deduplicates against Supabase, fires Discord webhook alerts for new listings, and displays all tracked jobs in a Next.js dashboard.

**Architecture:** A Node.js ESM scraper (`scripts/scrape.js`) queries each hospital's ATS JSON API in parallel. New job IDs are checked against a Supabase `jobs` table (using the service role key); unseen jobs are inserted and sent to Discord. The existing Next.js home page is replaced with a Server Component dashboard that reads from the same Supabase table using the anon key (protected by an RLS public-read policy). GitHub Actions cron triggers the scraper every 30 minutes using three repository secrets.

**Tech Stack:** Node.js 20 native `fetch`, `@supabase/supabase-js` (already installed), GitHub Actions, Supabase Postgres + RLS, Discord Webhooks, Next.js 15 App Router, Tailwind CSS.

---

### Task 1: Environment & Package Setup

**Files:**
- Modify: `.env.example`
- Modify: `package.json`
- Create: `scripts/package.json`

- [ ] **Step 1: Update .env.example with scraper vars**

Replace `.env.example` entirely:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
```

`SUPABASE_URL` used in the scraper scripts is the same value as `NEXT_PUBLIC_SUPABASE_URL` — both point to your Supabase project URL. The GitHub Actions secret is named `SUPABASE_URL` for the scraper.

- [ ] **Step 2: Add scrape script to root package.json**

In `package.json`, add `"scrape"` inside the `"scripts"` block so it reads:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "scrape": "node scripts/scrape.js"
}
```

- [ ] **Step 3: Create scripts/package.json to enable ESM**

Create `scripts/package.json`:
```json
{
  "type": "module"
}
```

This scopes ESM to the `scripts/` directory only, leaving the root `next.config.ts` unaffected.

- [ ] **Step 4: Commit**

```bash
git add .env.example package.json scripts/package.json
git commit -m "chore: scaffold scraper environment and ESM config"
```

---

### Task 2: Supabase Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Create the schema file**

Create `supabase/schema.sql`:
```sql
create extension if not exists "uuid-ossp";

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  job_id text unique not null,
  title text not null,
  hospital text not null,
  link text not null,
  created_at timestamptz not null default now()
);

create index if not exists jobs_created_at_idx on jobs (created_at desc);

alter table jobs enable row level security;

create policy "Public read access" on jobs
  for select using (true);
```

The RLS policy allows the anon/publishable key used by the Next.js dashboard to read jobs without authentication. The scraper uses the service role key which bypasses RLS entirely.

- [ ] **Step 2: Run the SQL in Supabase**

Open your Supabase project → SQL Editor → paste the file contents → Run. Verify the `jobs` table appears in the Table Editor with the correct columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add jobs table schema with public read RLS policy"
```

---

### Task 3: Script Utility Modules

**Files:**
- Create: `scripts/lib/supabase.js`
- Create: `scripts/lib/discord.js`
- Create: `scripts/lib/utils.js`
- Create: `scripts/lib/utils.test.js`

- [ ] **Step 1: Create scripts/lib/supabase.js**

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function jobExists(jobId) {
  const { data } = await supabase
    .from('jobs')
    .select('job_id')
    .eq('job_id', jobId)
    .maybeSingle();
  return data !== null;
}

export async function insertJob(job) {
  const { error } = await supabase.from('jobs').insert({
    job_id: job.job_id,
    title: job.title,
    hospital: job.hospital,
    link: job.link,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Create scripts/lib/discord.js**

```js
export async function notifyDiscord(job) {
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: job.title,
          url: job.link,
          color: 0x5865f2,
          fields: [{ name: 'Hospital', value: job.hospital, inline: true }],
          footer: { text: 'New Grad Nursing Residency Alert' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}
```

- [ ] **Step 3: Create scripts/lib/utils.js**

```js
export function dedup(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (seen.has(j.job_id)) return false;
    seen.add(j.job_id);
    return true;
  });
}
```

- [ ] **Step 4: Write the failing test for dedup**

Create `scripts/lib/utils.test.js`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dedup } from './utils.js';

describe('dedup', () => {
  it('removes duplicate job_ids', () => {
    const jobs = [
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'b-2', title: 'RN', hospital: 'Y', link: 'http://y' },
    ];
    const result = dedup(jobs);
    assert.equal(result.length, 2);
    assert.equal(result[0].job_id, 'a-1');
    assert.equal(result[1].job_id, 'b-2');
  });

  it('returns all jobs when no duplicates', () => {
    const jobs = [
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'b-2', title: 'RN', hospital: 'Y', link: 'http://y' },
    ];
    assert.equal(dedup(jobs).length, 2);
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(dedup([]), []);
  });
});
```

- [ ] **Step 5: Run test to confirm it fails (utils.js not yet written)**

```bash
node --test scripts/lib/utils.test.js
```
Expected: All 3 tests PASS (utils.js was already written in step 3 — this confirms the implementation is correct).

If you see import errors, verify `scripts/package.json` has `"type": "module"`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/
git commit -m "feat: add scraper utility modules (supabase, discord, dedup)"
```

---

### Task 4: Hospital Scrapers

Each module exports a single `scrape()` function returning `Array<{ job_id, title, hospital, link }>`. All five use JSON APIs — no HTML parsing required.

**Files:**
- Create: `scripts/hospitals/kaiser.js`
- Create: `scripts/hospitals/stanford-adult.js`
- Create: `scripts/hospitals/stanford-childrens.js`
- Create: `scripts/hospitals/ucsf.js`
- Create: `scripts/hospitals/sutter.js`

**API Verification Note:** Before deploying, verify each URL returns valid JSON by running:
```bash
curl -s "ENDPOINT_URL" | head -c 500
```
or for Workday POSTs:
```bash
curl -s -X POST "ENDPOINT_URL" -H "Content-Type: application/json" -d '{"appliedFacets":{},"limit":1,"offset":0,"searchText":"nurse"}' | head -c 500
```
The Workday CX pattern (`/wday/cxs/{tenant}/{site}/jobs`) is the stable public API used across all Workday-based hospital career portals.

#### Kaiser Permanente Northern California

Kaiser uses a Taleo-based REST API that accepts query parameters and returns JSON with a `positions` array.

- [ ] **Step 1: Create scripts/hospitals/kaiser.js**

```js
import { dedup } from '../lib/utils.js';

const BASE_URL = 'https://jobs.kaiserpermanente.org/api/apply/v2/jobs';
const KEYWORDS = ['clinical nurse i', 'new grad residency', 'rn resident'];
const HOSPITAL = 'Kaiser Permanente Northern California';

export async function scrape() {
  const params = new URLSearchParams({
    domain: 'kaiserpermanente.org',
    num: '50',
    start: '0',
    lang: 'en_US',
    Country: 'US',
    State: 'CA',
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const positions = data.positions ?? [];

  const matches = positions.filter((p) =>
    KEYWORDS.some((kw) => p.title?.toLowerCase().includes(kw))
  );

  return dedup(
    matches.map((p) => ({
      job_id: `kaiser-${p.id}`,
      title: p.title,
      hospital: HOSPITAL,
      link: `https://jobs.kaiserpermanente.org/job/${p.id}`,
    }))
  );
}
```

#### Stanford Health Care (Adult)

Stanford Health Care uses Workday. The CX API accepts POST with `searchText` and returns `jobPostings` with `externalPath` as the stable job identifier.

- [ ] **Step 2: Create scripts/hospitals/stanford-adult.js**

```js
import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/wday/cxs/stanfordhealthcare/SHC_External_Careers/jobs';
const BASE_SITE =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/en-US/SHC_External_Careers';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'Stanford Health Care';

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    const res = await fetch(CX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const postings = data.jobPostings ?? [];

    for (const p of postings) {
      results.push({
        job_id: `stanford-adult-${p.externalPath}`,
        title: p.title,
        hospital: HOSPITAL,
        link: `${BASE_SITE}${p.externalPath}`,
      });
    }
  }

  return dedup(results);
}
```

#### Stanford Children's Health (Lucile Packard)

- [ ] **Step 3: Create scripts/hospitals/stanford-childrens.js**

```js
import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://lucilepackard.wd1.myworkdayjobs.com/wday/cxs/lucilepackard/External_Lucile_Packard/jobs';
const BASE_SITE =
  'https://lucilepackard.wd1.myworkdayjobs.com/en-US/External_Lucile_Packard';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = "Stanford Children's Health (Lucile Packard)";

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    const res = await fetch(CX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const postings = data.jobPostings ?? [];

    for (const p of postings) {
      results.push({
        job_id: `stanford-childrens-${p.externalPath}`,
        title: p.title,
        hospital: HOSPITAL,
        link: `${BASE_SITE}${p.externalPath}`,
      });
    }
  }

  return dedup(results);
}
```

#### UCSF Health

UCSF runs on Workday (UC-wide instance `UCareers`).

- [ ] **Step 4: Create scripts/hospitals/ucsf.js**

```js
import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://ucsf.wd5.myworkdayjobs.com/wday/cxs/ucsf/UCareers/jobs';
const BASE_SITE = 'https://ucsf.wd5.myworkdayjobs.com/en-US/UCareers';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'UCSF Health';

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    const res = await fetch(CX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const postings = data.jobPostings ?? [];

    for (const p of postings) {
      results.push({
        job_id: `ucsf-${p.externalPath}`,
        title: p.title,
        hospital: HOSPITAL,
        link: `${BASE_SITE}${p.externalPath}`,
      });
    }
  }

  return dedup(results);
}
```

#### Sutter Health

- [ ] **Step 5: Create scripts/hospitals/sutter.js**

```js
import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://sutter.wd1.myworkdayjobs.com/wday/cxs/sutter/SHCO_External/jobs';
const BASE_SITE = 'https://sutter.wd1.myworkdayjobs.com/en-US/SHCO_External';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'Sutter Health';

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    const res = await fetch(CX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const postings = data.jobPostings ?? [];

    for (const p of postings) {
      results.push({
        job_id: `sutter-${p.externalPath}`,
        title: p.title,
        hospital: HOSPITAL,
        link: `${BASE_SITE}${p.externalPath}`,
      });
    }
  }

  return dedup(results);
}
```

- [ ] **Step 6: Commit all hospital scrapers**

```bash
git add scripts/hospitals/
git commit -m "feat: add hospital scraper modules (Kaiser, Stanford, UCSF, Sutter)"
```

---

### Task 5: Main Scraper Orchestrator

**Files:**
- Create: `scripts/scrape.js`

- [ ] **Step 1: Create scripts/scrape.js**

```js
import { scrape as scrapeKaiser } from './hospitals/kaiser.js';
import { scrape as scrapeStanfordAdult } from './hospitals/stanford-adult.js';
import { scrape as scrapeStanfordChildrens } from './hospitals/stanford-childrens.js';
import { scrape as scrapeUCSF } from './hospitals/ucsf.js';
import { scrape as scrapeSutter } from './hospitals/sutter.js';
import { jobExists, insertJob } from './lib/supabase.js';
import { notifyDiscord } from './lib/discord.js';

const scrapers = [
  scrapeKaiser,
  scrapeStanfordAdult,
  scrapeStanfordChildrens,
  scrapeUCSF,
  scrapeSutter,
];

async function run() {
  const results = await Promise.allSettled(scrapers.map((fn) => fn()));

  const allJobs = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const failed = results.filter((r) => r.status === 'rejected');
  for (const f of failed) console.error('Scraper failed:', f.reason);

  let newCount = 0;
  for (const job of allJobs) {
    const exists = await jobExists(job.job_id);
    if (!exists) {
      await insertJob(job);
      await notifyDiscord(job);
      newCount++;
    }
  }

  console.log(`Checked ${allJobs.length} jobs, found ${newCount} new.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Test the scraper locally**

Run with your real credentials (one-time local test):

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
node scripts/scrape.js
```

Expected output:
```
Checked N jobs, found M new.
```

If a hospital returns 0 jobs, verify its API URL responds correctly with:
```bash
curl -s -X POST "HOSPITAL_CX_URL" \
  -H "Content-Type: application/json" \
  -d '{"appliedFacets":{},"limit":1,"offset":0,"searchText":"nurse"}' \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.stringify(JSON.parse(d),null,2).slice(0,500))"
```

If the response has a different structure than `{ jobPostings: [...] }`, update that hospital's scraper to match the actual response shape.

- [ ] **Step 3: Commit**

```bash
git add scripts/scrape.js
git commit -m "feat: add main scraper orchestrator"
```

---

### Task 6: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/check-jobs.yml`

- [ ] **Step 1: Add GitHub repository secrets**

In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret. Add all three:

| Secret Name | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (same as `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `DISCORD_WEBHOOK_URL` | Discord channel → Edit → Integrations → Webhooks → Copy Webhook URL |

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/check-jobs.yml`:
```yaml
name: Check Nursing Jobs

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: node scripts/scrape.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

The `workflow_dispatch` trigger lets you run the scraper manually from GitHub Actions → Run workflow to test before waiting for the cron.

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/check-jobs.yml
git commit -m "feat: add GitHub Actions cron workflow for job scraping"
git push origin main
```

- [ ] **Step 4: Verify the workflow**

Go to your GitHub repo → Actions tab. You should see "Check Nursing Jobs" listed. Click "Run workflow" → "Run workflow" to trigger a manual test run. Confirm the run completes with green status and the scraper logs appear.

---

### Task 7: Next.js Dashboard

Replace the boilerplate home page with a live jobs dashboard. The `fetchJobs` action uses the existing cookie-based server client with the anon key — the RLS policy from Task 2 allows public reads without authentication.

**Files:**
- Create: `app/actions.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create app/actions.ts**

```ts
'use server';

import { createClient } from '@/lib/supabase/server';

export type Job = {
  id: string;
  job_id: string;
  title: string;
  hospital: string;
  link: string;
  created_at: string;
};

export async function fetchJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Replace app/page.tsx with the dashboard**

Replace the entire contents of `app/page.tsx`:
```tsx
import { fetchJobs } from './actions';
import { ThemeSwitcher } from '@/components/theme-switcher';

export const revalidate = 60;

export default async function Home() {
  const jobs = await fetchJobs();

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <span className="font-semibold">Bay Area New Grad RN Tracker</span>
            <ThemeSwitcher />
          </div>
        </nav>

        <div className="w-full max-w-5xl px-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Open Nursing Residencies</h1>
            <span className="text-sm text-foreground/60">{jobs.length} listings</span>
          </div>

          {jobs.length === 0 ? (
            <p className="text-foreground/60 py-12 text-center">
              No jobs found yet — the scraper will populate this list automatically.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/5">
                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                    <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                    <th className="text-left px-4 py-3 font-semibold">Detected</th>
                    <th className="text-left px-4 py-3 font-semibold">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-foreground/10 hover:bg-foreground/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3 text-foreground/70">{job.hospital}</td>
                      <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">
                        {new Date(job.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8 mt-auto">
          <p className="text-foreground/40">
            Auto-refreshes every 60s · Scraped every 30 min
          </p>
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript build**

```bash
npm run build
```

Expected: Build succeeds. If you see a Supabase env var error, ensure your local `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set.

- [ ] **Step 4: Verify in dev server**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Header shows "Bay Area New Grad RN Tracker"
- Body shows "No jobs found yet" if the table is empty, or the jobs table if populated
- Theme switcher works in top-right corner
- No console errors

- [ ] **Step 5: Commit**

```bash
git add app/actions.ts app/page.tsx
git commit -m "feat: add nursing residency job dashboard"
```

---

## Deployment Checklist

Before going live on Vercel:

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel environment variables (Project → Settings → Environment Variables).
2. Confirm GitHub Actions secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_WEBHOOK_URL`) are set.
3. Trigger a manual workflow run from GitHub Actions to confirm end-to-end flow before the first cron fires.
4. If any hospital returns 0 results, verify the ATS endpoint URL with a curl command (see Task 5, Step 2).
