import { dedup } from '../lib/utils.js';

const BASE_URL = 'https://jobs.kaiserpermanente.org/api/apply/v2/jobs';
const KEYWORDS = ['clinical nurse i', 'new grad residency', 'rn resident'];
const HOSPITAL = 'Kaiser Permanente Northern California';

export async function scrape() {
  const params = new URLSearchParams({
    domain: 'kaiserpermanente.org',
    num: '50',
    start: '0',
    lang: 'en_US',
    Country: 'US',
    State: 'CA',
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const positions = data.positions ?? [];

  const matches = positions.filter((p) =>
    KEYWORDS.some((kw) => p.title?.toLowerCase().includes(kw))
  );

  return dedup(
    matches.map((p) => ({
      job_id: `kaiser-${p.id}`,
      title: p.title,
      hospital: HOSPITAL,
      link: `https://jobs.kaiserpermanente.org/job/${p.id}`,
    }))
  );
}
