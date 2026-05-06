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
