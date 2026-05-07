import { dedup, isNewGradJob } from '../lib/utils.js';

const BASE = 'https://jmh.wd5.myworkdayjobs.com';
const NURSING_HASH = '318c8bb6f553100021d223d9780d30be';
const SEARCH_URL = `${BASE}/JohnMuirHealthCareers/3/search/${NURSING_HASH}`;
const KEYWORDS = ['New Grad', 'Nurse Residency', 'RN Resident'];
const HOSPITAL = 'John Muir Health';

function extractListItems(data) {
  try {
    return data[0]?.body?.children?.[0]?.children?.[0]?.listItems ?? [];
  } catch {
    return [];
  }
}

export async function scrape() {
  const results = [];
  const seen = new Set();

  for (const keyword of KEYWORDS) {
    try {
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({ searchText: keyword }),
      });

      console.log(`[John Muir] keyword="${keyword}" status=${res.status}`);
      if (!res.ok) continue;

      const data = await res.json();
      const items = extractListItems(data);

      for (const item of items) {
        const title = item.title?.instances?.[0]?.text ?? '';
        const commandLink = item.title?.commandLink ?? '';
        if (!title || !commandLink) continue;
        if (!isNewGradJob(title)) continue;

        const slugPart = commandLink.split('/').pop();
        if (seen.has(slugPart)) continue;
        seen.add(slugPart);

        results.push({
          job_id: `john-muir-${slugPart}`,
          title,
          hospital: HOSPITAL,
          link: `${BASE}${commandLink}`,
        });
      }
    } catch (err) {
      console.log(`[John Muir] keyword="${keyword}" error: ${err.message}`);
      continue;
    }
  }

  return dedup(results);
}
