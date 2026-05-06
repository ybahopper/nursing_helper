'use server';

import { createClient } from '@/lib/supabase/server';

export type Job = {
  id: string;
  job_id: string;
  title: string;
  hospital: string;
  link: string;
  created_at: string;
};

export async function fetchJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
