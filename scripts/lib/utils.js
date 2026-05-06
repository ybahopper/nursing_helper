export function dedup(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (seen.has(j.job_id)) return false;
    seen.add(j.job_id);
    return true;
  });
}
