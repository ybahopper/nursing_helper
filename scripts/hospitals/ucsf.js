import { dedup, isNewGradJob } from '../lib/utils.js';

const BASE_URL = 'https://iazuqy.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions';
const APPLY_BASE = 'https://careers.ucsf.edu/jobs';
const KEYWORDS = ['New Grad', 'Nurse Residency', 'RN Resident'];
const HOSPITAL = 'UCSF Health';

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        expand: 'requisitionList.secondaryLocations,flexFieldsFacet.values',
        finder: 'findReqs',
        'findReqs;siteNumber': 'CX_1',
        'findReqs;keyword': keyword,
        'findReqs;selectedFlexFieldsFacets': '',
        limit: '25',
        offset: '0',
      });

      const res = await fetch(`${BASE_URL}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[UCSF] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const data = await res.json();
      const items = data.items ?? [];

      const filtered = items.filter((item) =>
        isNewGradJob(item.Title)
      );

      for (const item of filtered) {
        results.push({
          job_id: `ucsf-${item.Id}`,
          title: item.Title,
          hospital: HOSPITAL,
          link: `${APPLY_BASE}/${item.Id}`,
        });
      }
    } catch (err) {
      console.log(`[UCSF] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
