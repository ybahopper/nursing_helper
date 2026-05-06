import { scrape as scrapeKaiser } from './hospitals/kaiser.js';
import { scrape as scrapeStanfordAdult } from './hospitals/stanford-adult.js';
import { scrape as scrapeStanfordChildrens } from './hospitals/stanford-childrens.js';
import { scrape as scrapeUCSF } from './hospitals/ucsf.js';
import { scrape as scrapeSutter } from './hospitals/sutter.js';
import { jobExists, insertJob } from './lib/supabase.js';
import { notifyDiscord } from './lib/discord.js';

const scrapers = [
  { name: 'Kaiser', fn: scrapeKaiser },
  { name: 'Stanford Adult', fn: scrapeStanfordAdult },
  { name: 'Stanford Childrens', fn: scrapeStanfordChildrens },
  { name: 'UCSF', fn: scrapeUCSF },
  { name: 'Sutter', fn: scrapeSutter },
];

async function run() {
  const results = await Promise.allSettled(scrapers.map(({ fn }) => fn()));

  const allJobs = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = scrapers[i].name;
    if (r.status === 'fulfilled') {
      console.log(`[${name}] returned ${r.value.length} jobs`);
      allJobs.push(...r.value);
    } else {
      console.error(`[${name}] FAILED:`, r.reason);
    }
  }

  console.log(`\nTotal jobs across all scrapers: ${allJobs.length}`);

  let newCount = 0;
  for (const job of allJobs) {
    const exists = await jobExists(job.job_id);
    if (!exists) {
      console.log(`[new] ${job.hospital} — ${job.title}`);
      await insertJob(job);
      await notifyDiscord(job);
      newCount++;
    }
  }

  console.log(`\nChecked ${allJobs.length} jobs, found ${newCount} new.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
