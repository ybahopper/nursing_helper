import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://ucsf.wd5.myworkdayjobs.com/wday/cxs/ucsf/UCareers/jobs';
const BASE_SITE = 'https://ucsf.wd5.myworkdayjobs.com/en-US/UCareers';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'UCSF Health';

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    try {
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
    } catch {
      continue;
    }
  }

  return dedup(results);
}
