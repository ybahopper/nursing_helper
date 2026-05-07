import { dedup, isNewGradJob } from '../lib/utils.js';

const BASE_URL = 'https://alameda-health-system-careers.hctsportals.com';
const HOSPITAL = 'Alameda Health System';
const SEARCH_PATHS = [
  '/search/nursing/jobs?sort_by=updated_at,desc',
  '/search/jobs?q=nurse+residency&sort_by=updated_at,desc',
  '/search/jobs?q=new+grad+rn&sort_by=updated_at,desc',
];

const JOB_LINK_RE = /href="(\/jobs\/([^"?#]+))"[^>]*>\s*<[^>]+>\s*([^<]{5,})/g;

export async function scrape() {
  const results = [];
  const seen = new Set();

  for (const path of SEARCH_PATHS) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
          Accept: '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${BASE_URL}/search/nursing/jobs`,
        },
      });

      console.log(`[Alameda Health] path="${path}" status=${res.status}`);
      if (!res.ok) continue;

      const html = await res.text();

      for (const [, jobPath, id, rawTitle] of html.matchAll(JOB_LINK_RE)) {
        const title = rawTitle.trim();
        if (!isNewGradJob(title)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        results.push({
          job_id: `alameda-health-${id}`,
          title,
          hospital: HOSPITAL,
          link: `${BASE_URL}${jobPath}`,
        });
      }
    } catch (err) {
      console.log(`[Alameda Health] path="${path}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
