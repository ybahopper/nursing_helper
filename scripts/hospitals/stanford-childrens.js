import { dedup, isNewGradJob } from '../lib/utils.js';

const SR_URL = 'https://api.smartrecruiters.com/v1/companies/StanfordMedicineChildrensHealth/postings';
const HOSPITAL = "Stanford Children's Health (Lucile Packard)";
const KEYWORDS = ['new grad', 'nurse residency', 'rn resident'];

export async function scrape() {
  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({ q: keyword, limit: '25', offset: '0' });
      const res = await fetch(`${SR_URL}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      });

      console.log(`[Stanford Childrens] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const data = await res.json();
      const postings = (data.content ?? []).filter((p) => isNewGradJob(p.name));

      for (const p of postings) {
        results.push({
          job_id: `stanford-childrens-${p.id}`,
          title: p.name,
          hospital: HOSPITAL,
          link: p.ref ?? `https://careers.smartrecruiters.com/StanfordMedicineChildrensHealth/${p.id}`,
        });
      }
    } catch (err) {
      console.log(`[Stanford Childrens] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
