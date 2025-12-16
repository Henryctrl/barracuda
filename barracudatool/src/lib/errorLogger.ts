import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  details?: unknown;
  user_id?: string;
  stack?: string;
}

export async function logError(error: ErrorLog) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('error_logs').insert({
      ...error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}

export async function getErrorLogs(limit = 100, level?: 'error' | 'warning' | 'info') {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (level) {
      query = query.eq('level', level);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Failed to fetch error logs:', err);
    return [];
  }
}
