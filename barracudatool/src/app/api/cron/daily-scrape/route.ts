import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting daily scrape job...');
    const startTime = Date.now();

    // Step 1: Scrape CAD-IMMO properties
    console.log('📡 Starting property scraping...');
    
    const urlsToScrape = [
      'https://www.cad-immo.com/vente/bien/maison',
      'https://www.cad-immo.com/vente/bien/appartement',
      'https://www.cad-immo.com/vente/bien/terrain',
    ];

    let totalScraped = 0;

    for (const searchUrl of urlsToScrape) {
      console.log(`📡 Scraping: ${searchUrl}`);
      
      try {
        const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': process.env.CRON_SECRET!,
          },
          body: JSON.stringify({
            searchUrl: searchUrl,
            maxPages: 3,
          }),
        });

        const scrapeResult = await scrapeResponse.json();
        console.log(`✅ Scraped from ${searchUrl}:`, scrapeResult);
        
        if (scrapeResult.totalScraped) {
          totalScraped += scrapeResult.totalScraped;
        }
      } catch (scrapeError) {
        console.error(`❌ Failed to scrape ${searchUrl}:`, scrapeError);
      }
    }

    console.log(`✅ Total properties scraped: ${totalScraped}`);

    // Step 2: Run property matching for all active clients
    console.log('🎯 Running property matching...');
    let matchResult: any = {};
    
    try {
      const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/match-properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({}),
      });

      matchResult = await matchResponse.json();
      console.log('✅ Matching completed:', matchResult);
    } catch (matchError) {
      console.error('❌ Matching failed:', matchError);
    }

    const duration = Date.now() - startTime;

    // Step 3: Log the job completion
    await supabase.from('cron_logs').insert({
      job_name: 'daily-scrape',
      status: 'success',
      duration_ms: duration,
      properties_scraped: totalScraped,
      matches_created: matchResult.newMatches || 0,
      details: {
        totalScraped,
        matchResult,
      },
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      scraped: totalScraped,
      matched: matchResult.newMatches || 0,
      message: 'Daily scrape completed successfully',
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);

    // Log the failure
    await supabase.from('cron_logs').insert({
      job_name: 'daily-scrape',
      status: 'failed',
      duration_ms: 0,
      properties_scraped: 0,
      matches_created: 0,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
