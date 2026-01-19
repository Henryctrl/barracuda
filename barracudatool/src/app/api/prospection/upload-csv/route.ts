// src/app/api/prospection/upload-csv/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { prospects } = body;

  if (!Array.isArray(prospects)) {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  }

  // Add user_id to each prospect
  const prospectsWithUser = prospects.map(p => ({ ...p, user_id: user.id }));

  const { data, error } = await supabase
    .from('property_prospects')
    .insert(prospectsWithUser)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data.length, data });
}
