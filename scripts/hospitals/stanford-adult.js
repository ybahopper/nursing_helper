import { dedup } from '../lib/utils.js';

const CX_URL =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/wday/cxs/stanfordhealthcare/SHC_External_Careers/jobs';
const BASE_SITE =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/en-US/SHC_External_Careers';
const KEYWORDS = ['Nurse', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'Stanford Health Care';

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
          job_id: `stanford-adult-${p.externalPath}`,
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
