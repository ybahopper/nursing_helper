import { dedup, isNewGradJob } from '../lib/utils.js';
import { getWorkdayCsrf, workdayPost } from '../lib/workday.js';

const CX_URL =
  'https://sutterhealth.wd1.myworkdayjobs.com/wday/cxs/sutterhealth/SH/jobs';
const BASE_SITE = 'https://sutterhealth.wd1.myworkdayjobs.com/en-US/SH';
const KEYWORDS = ['New Grad', 'Nurse Residency', 'RN Resident'];
const HOSPITAL = 'Sutter Health';

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
      const postings = (data.jobPostings ?? []).filter((p) => isNewGradJob(p.title));
      for (const p of postings) {
        results.push({
          job_id: `sutter-${p.externalPath}`,
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
