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
          job_id: `stanford-childrens-${p.externalPath}`,
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
