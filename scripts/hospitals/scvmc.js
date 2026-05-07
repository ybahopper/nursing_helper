import { dedup, isNewGradJob } from '../lib/utils.js';

const GJ_BASE = 'https://www.governmentjobs.com';
const AGENCY = 'santaclara';
const KEYWORDS = ['nurse residency', 'new grad nurse', 'rn resident'];
const HOSPITAL = 'Santa Clara Valley Medical Center';

const JOB_LINK_RE = new RegExp(
  `href="(/careers/${AGENCY}/jobs/(\\d+)/([\\w-]+))"`,
  'g'
);

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
        keywords: keyword,
        pagetype: 'jobOpportunitiesJobs',
      });
      const res = await fetch(`${GJ_BASE}/careers/${AGENCY}?${params}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[SCVMC] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const html = await res.text();
      const seen = new Set();

      for (const [, path, id, slug] of html.matchAll(JOB_LINK_RE)) {
        if (seen.has(id)) continue;
        seen.add(id);
        const title = slugToTitle(slug);
        if (!isNewGradJob(title)) continue;
        results.push({
          job_id: `scvmc-${id}`,
          title,
          hospital: HOSPITAL,
          link: `${GJ_BASE}${path}`,
        });
      }
    } catch (err) {
      console.log(`[SCVMC] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
