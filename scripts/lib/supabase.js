import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function jobExists(jobId) {
  const { data } = await supabase
    .from('jobs')
    .select('job_id')
    .eq('job_id', jobId)
    .maybeSingle();
  return data !== null;
}

export async function insertJob(job) {
  const { error } = await supabase.from('jobs').insert({
    job_id: job.job_id,
    title: job.title,
    hospital: job.hospital,
    link: job.link,
  });
  if (error) throw error;
}
