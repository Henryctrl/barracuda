import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to validate and parse dates
function parseDate(dateString: string | null | undefined): string | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
}

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

  const validProspects: any[] = [];
  const failedProspects: any[] = [];

  // Process prospects (no geocoding - should already be geocoded in review queue)
  prospects.forEach((p, i) => {
    const errors: string[] = [];

    // Validate required fields
    if (!p.address) {
      errors.push('Missing address');
    }

    if (!p.latitude || !p.longitude) {
      errors.push('Missing coordinates - entry must be geocoded');
    }

    if (p.price && (isNaN(p.price) || p.price < 0)) {
      errors.push('Invalid price');
    }

    if (p.owner_email && !p.owner_email.includes('@')) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      failedProspects.push({
        row_number: i + 1,
        data: p,
        errors: errors,
        failed_at: new Date().toISOString()
      });
      return;
    }

    // Prepare valid prospect
    validProspects.push({
      ...p,
      user_id: user.id,
      last_contact_date: parseDate(p.last_contact_date),
      return_date: parseDate(p.return_date),
      owner_email: p.owner_email && p.owner_email.trim() !== '' ? p.owner_email : null,
      owner_phone: p.owner_phone && p.owner_phone.trim() !== '' ? p.owner_phone : null,
      owner_address: p.owner_address && p.owner_address.trim() !== '' ? p.owner_address : null,
      owner_name: p.owner_name && p.owner_name.trim() !== '' ? p.owner_name : null,
      notes: p.notes && p.notes.trim() !== '' ? p.notes : null,
    });
  });

  let insertedData = [];
  let insertError = null;

  // Insert valid prospects
  if (validProspects.length > 0) {
    const { data, error } = await supabase
      .from('property_prospects')
      .insert(validProspects)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      insertError = error;
    } else {
      insertedData = data || [];
    }
  }

  return NextResponse.json({ 
    success: insertedData.length,
    failed: failedProspects.length,
    inserted: insertedData,
    failures: failedProspects,
    error: insertError ? insertError.message : null
  });
}
