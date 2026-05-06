const TITLE_FILTER = ['new grad', 'residency', 'rn resident', 'nurse resident', 'graduate nurse', 'graduate rn'];

export function isNewGradJob(title) {
  const lower = title?.toLowerCase() ?? '';
  return TITLE_FILTER.some((t) => lower.includes(t));
}

export function dedup(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (seen.has(j.job_id)) return false;
    seen.add(j.job_id);
    return true;
  });
}
