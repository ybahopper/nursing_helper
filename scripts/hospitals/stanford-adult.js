import { dedup } from '../lib/utils.js';
import { getWorkdayCsrf, workdayPost } from '../lib/workday.js';

const CX_URL =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/wday/cxs/stanfordhealthcare/SHC_External_Career_Site/jobs';
const BASE_SITE =
  'https://stanfordhealthcare.wd5.myworkdayjobs.com/en-US/SHC_External_Career_Site';
const KEYWORDS = ['Clinical Nurse I', 'New Grad Residency', 'RN Resident'];
const HOSPITAL = 'Stanford Health Care';

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
