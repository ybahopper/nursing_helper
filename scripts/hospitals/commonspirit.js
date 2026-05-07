import { dedup, isNewGradJob } from '../lib/utils.js';

const BASE = 'https://careers-commonspirit.icims.com';
const SEARCH_URL = `${BASE}/jobs/search`;
const KEYWORDS = ['new grad rn', 'nurse residency', 'rn resident'];
const HOSPITAL = 'CommonSpirit Health (Dignity Health)';

const JOB_LINK_RE = /href="(\/jobs\/(\d+)\/([^"]+)\/job)"/g;

function slugToTitle(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        ss: '1',
        searchKeyword: keyword,
        searchCategory: 'Nursing',
        searchLocation: 'California',
        searchLocationType: 'state',
        in_iframe: '0',
      });
      const res = await fetch(`${SEARCH_URL}?${params}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[CommonSpirit] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const html = await res.text();
      const seen = new Set();

      for (const [, path, id, slug] of html.matchAll(JOB_LINK_RE)) {
        if (seen.has(id)) continue;
        seen.add(id);
        const title = slugToTitle(slug);
        if (!isNewGradJob(title)) continue;
        results.push({
          job_id: `commonspirit-${id}`,
          title,
          hospital: HOSPITAL,
          link: `${BASE}${path}`,
        });
      }
    } catch (err) {
      console.log(`[CommonSpirit] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
