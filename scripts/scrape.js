import { scrape as scrapeKaiser } from './hospitals/kaiser.js';
import { scrape as scrapeStanfordAdult } from './hospitals/stanford-adult.js';
import { scrape as scrapeStanfordChildrens } from './hospitals/stanford-childrens.js';
import { scrape as scrapeUCSF } from './hospitals/ucsf.js';
import { scrape as scrapeSutter } from './hospitals/sutter.js';
import { jobExists, insertJob } from './lib/supabase.js';
import { notifyDiscord } from './lib/discord.js';

const scrapers = [
  scrapeKaiser,
  scrapeStanfordAdult,
  scrapeStanfordChildrens,
  scrapeUCSF,
  scrapeSutter,
];

async function run() {
  const results = await Promise.allSettled(scrapers.map((fn) => fn()));

  const allJobs = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const failed = results.filter((r) => r.status === 'rejected');
  for (const f of failed) console.error('Scraper failed:', f.reason);

  let newCount = 0;
  for (const job of allJobs) {
    const exists = await jobExists(job.job_id);
    if (!exists) {
      await insertJob(job);
      await notifyDiscord(job);
      newCount++;
    }
  }

  console.log(`Checked ${allJobs.length} jobs, found ${newCount} new.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
