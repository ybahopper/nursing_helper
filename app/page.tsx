import { fetchJobs } from './actions';
import { ThemeSwitcher } from '@/components/theme-switcher';

export const revalidate = 60;

export default async function Home() {
  const jobs = await fetchJobs();

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <span className="font-semibold">Bay Area New Grad RN Tracker</span>
            <ThemeSwitcher />
          </div>
        </nav>

        <div className="w-full max-w-5xl px-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Open Nursing Residencies</h1>
            <span className="text-sm text-foreground/60">{jobs.length} listings</span>
          </div>

          {jobs.length === 0 ? (
            <p className="text-foreground/60 py-12 text-center">
              No jobs found yet — the scraper will populate this list automatically.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/5">
                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                    <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                    <th className="text-left px-4 py-3 font-semibold">Detected</th>
                    <th className="text-left px-4 py-3 font-semibold">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-foreground/10 hover:bg-foreground/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3 text-foreground/70">{job.hospital}</td>
                      <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">
                        {new Date(job.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8 mt-auto">
          <p className="text-foreground/40">
            Auto-refreshes every 60s · Scraped every 30 min
          </p>
        </footer>
      </div>
    </main>
  );
}
