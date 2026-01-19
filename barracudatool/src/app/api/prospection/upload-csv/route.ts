// src/app/api/prospection/upload-csv/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to validate and parse dates
function parseDate(dateString: string | null | undefined): string | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if it's a valid date
  if (isNaN(date.getTime())) {
    return null;
  }

  // Return ISO format (YYYY-MM-DD)
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

  // Separate valid and failed prospects
  const validProspects: any[] = [];
  const failedProspects: any[] = [];

  prospects.forEach((p, index) => {
    // Validate required fields
    const errors: string[] = [];

    if (!p.address && !p.link) {
      errors.push('Missing both address and link');
    }

    if (p.price && (isNaN(p.price) || p.price < 0)) {
      errors.push('Invalid price');
    }

    if (p.owner_email && !p.owner_email.includes('@')) {
      errors.push('Invalid email format');
    }

    // If there are errors, add to failed list
    if (errors.length > 0) {
      failedProspects.push({
        row_number: index + 2, // +2 because row 1 is headers, index starts at 0
        data: p,
        errors: errors,
        failed_at: new Date().toISOString()
      });
    } else {
      // Clean and prepare valid prospect
      validProspects.push({
        ...p,
        user_id: user.id,
        last_contact_date: parseDate(p.last_contact_date),
        owner_email: p.owner_email && p.owner_email.trim() !== '' ? p.owner_email : null,
        owner_phone: p.owner_phone && p.owner_phone.trim() !== '' ? p.owner_phone : null,
        owner_address: p.owner_address && p.owner_address.trim() !== '' ? p.owner_address : null,
        owner_name: p.owner_name && p.owner_name.trim() !== '' ? p.owner_name : null,
        notes: p.notes && p.notes.trim() !== '' ? p.notes : null,
      });
    }
  });

  let insertedData = [];
  let insertError = null;

  // Try to insert valid prospects
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

  // Store failed prospects in a separate table (if you want persistence)
  // Or just return them to the frontend
  if (failedProspects.length > 0) {
    console.warn(`${failedProspects.length} prospects failed validation:`, failedProspects);
  }

  return NextResponse.json({ 
    success: insertedData.length,
    failed: failedProspects.length,
    inserted: insertedData,
    failures: failedProspects,
    error: insertError ? insertError.message : null
  });
}
