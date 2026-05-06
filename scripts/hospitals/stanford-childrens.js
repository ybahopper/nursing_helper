import { dedup } from '../lib/utils.js';
import { getWorkdayCsrf, workdayPost } from '../lib/workday.js';

const CX_URL =
  'https://lucilepackard.wd1.myworkdayjobs.com/wday/cxs/lucilepackard/External_Lucile_Packard/jobs';
const BASE_SITE =
  'https://lucilepackard.wd1.myworkdayjobs.com/en-US/External_Lucile_Packard';
const KEYWORDS = ['Nurse', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = "Stanford Children's Health (Lucile Packard)";

export async function scrape() {
  const results = [];
  let cookieHeader, csrfToken;
  try {
    ({ cookieHeader, csrfToken } = await getWorkdayCsrf(BASE_SITE));
  } catch {
    return [];
  }

  for (const keyword of KEYWORDS) {
    try {
      const res = await workdayPost(CX_URL, keyword, cookieHeader, csrfToken);
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
