import { dedup, isNewGradJob } from '../lib/utils.js';

const BASE_URL = 'https://iazuqy.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions';
const HOSPITAL = 'UCSF Health';
const KEYWORDS = ['New Grad', 'Nurse Residency', 'RN Resident'];

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        finder: `findReqs;siteNumber=CX_1,keyword=${keyword}`,
        limit: '25',
        offset: '0',
      });

      const res = await fetch(`${BASE_URL}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[UCSF] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const data = await res.json();
      const items = (data.items ?? []).filter((item) => isNewGradJob(item.Title));

      for (const item of items) {
        results.push({
          job_id: `ucsf-${item.Id}`,
          title: item.Title,
          hospital: HOSPITAL,
          link: `https://iazuqy.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/${item.Id}`,
        });
      }
    } catch (err) {
      console.log(`[UCSF] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
