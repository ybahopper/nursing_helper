import { dedup, isNewGradJob } from '../lib/utils.js';
import { getWorkdayCsrf, workdayPost } from '../lib/workday.js';

const CX_URL = 'https://ech.wd5.myworkdayjobs.com/wday/cxs/ech/ech/jobs';
const BASE_SITE = 'https://ech.wd5.myworkdayjobs.com/en-US/ech';
const KEYWORDS = ['New Grad', 'Nurse Residency', 'RN Resident'];
const HOSPITAL = 'El Camino Health';

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
          job_id: `el-camino-${p.externalPath}`,
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
