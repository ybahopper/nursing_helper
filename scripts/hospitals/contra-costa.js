import { dedup, isNewGradJob } from '../lib/utils.js';

const GJ_BASE = 'https://www.governmentjobs.com';
const AGENCY = 'contracosta';
const KEYWORDS = ['nurse residency', 'clinical nurse i', 'new grad nurse'];
const HOSPITAL = 'Contra Costa Regional Medical Center';

const JOB_RE = /href="(\/careers\/contracosta\/jobs\/(\d+)\/[^"]+)" rel="[^"]*">\s*([^<]+)\s*<\/a>/g;

function isCountyNewGrad(title) {
  return isNewGradJob(title) || /\bclinical\s+nurse\s+i\b(?!i)/i.test(title);
}

export async function scrape() {
  const results = [];
  const seen = new Set();

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        keywords: keyword,
        pagetype: 'jobOpportunitiesJobs',
      });
      const res = await fetch(`${GJ_BASE}/careers/${AGENCY}?${params}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[Contra Costa] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const html = await res.text();

      for (const [, path, id, rawTitle] of html.matchAll(JOB_RE)) {
        const title = rawTitle.trim();
        if (!isCountyNewGrad(title)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        results.push({
          job_id: `contra-costa-${id}`,
          title,
          hospital: HOSPITAL,
          link: `${GJ_BASE}${path}`,
        });
      }
    } catch (err) {
      console.log(`[Contra Costa] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
