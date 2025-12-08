import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    
    
    // Verify this is coming from Vercel Cron
   
   
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   console.error('❌ Unauthorized cron request');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('🚀 Starting daily scrape job...');
    console.log('🔍 Railway URL:', process.env.RAILWAY_SCRAPER_URL);
    const startTime = Date.now();

    // Step 1: Scrape CAD-IMMO properties via Railway
    console.log('📡 Starting property scraping via Railway...');
    
    const urlsToScrape = [
      'https://cad-immo.com/fr/ventes',
    ];

    let totalScraped = 0;
    let totalInserted = 0;

    for (const searchUrl of urlsToScrape) {
      console.log(`📡 Scraping: ${searchUrl}`);
      
      try {
        const railwayUrl = `${process.env.RAILWAY_SCRAPER_URL}/scrape`;
        console.log('🔍 Full Railway URL:', railwayUrl);

        const scrapeResponse = await fetch(railwayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchUrl: searchUrl,
            maxPages: 3,
          }),
        });

        console.log('🔍 Railway response status:', scrapeResponse.status);
        console.log('🔍 Railway response ok:', scrapeResponse.ok);
        
        const responseText = await scrapeResponse.text();
        console.log('🔍 Railway response body length:', responseText.length);
        console.log('🔍 Railway response body:', responseText.substring(0, 200));

        if (!scrapeResponse.ok) {
          console.error(`❌ Scrape failed for ${searchUrl}: ${scrapeResponse.status}`);
          console.error('Response:', responseText);
          continue;
        }

        if (!responseText) {
          console.error('❌ Empty response from Railway');
          continue;
        }

        const scrapeResult = JSON.parse(responseText);
        console.log(`✅ Scraped from ${searchUrl}:`, scrapeResult);
        
        if (scrapeResult.scraped) {
          totalScraped += scrapeResult.scraped;
        }
        if (scrapeResult.inserted) {
          totalInserted += scrapeResult.inserted;
        }
      } catch (scrapeError) {
        console.error(`❌ Failed to scrape ${searchUrl}:`, scrapeError);
      }
    }

    console.log(`✅ Total properties scraped: ${totalScraped}`);
    console.log(`✅ Total properties inserted: ${totalInserted}`);

    // Step 2: Run property matching for all active clients
    console.log('🎯 Running property matching...');
    let matchResult: { newMatches?: number; [key: string]: unknown } = {};
    
    try {
      const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/match-properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({}),
      });

      if (matchResponse.ok) {
        matchResult = await matchResponse.json();
        console.log('✅ Matching completed:', matchResult);
      } else {
        console.error('❌ Matching failed:', matchResponse.status);
      }
    } catch (matchError) {
      console.error('❌ Matching error:', matchError);
    }

    const duration = Date.now() - startTime;

    // Step 3: Log the job completion
    try {
      await supabase.from('cron_logs').insert({
        job_name: 'daily-scrape',
        status: 'success',
        duration_ms: duration,
        properties_scraped: totalScraped,
        matches_created: matchResult.newMatches || 0,
        details: {
          totalScraped,
          totalInserted,
          matchResult,
        },
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log cron execution:', logError);
    }

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      scraped: totalScraped,
      inserted: totalInserted,
      matched: matchResult.newMatches || 0,
      message: 'Daily scrape completed successfully',
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);

    try {
      await supabase.from('cron_logs').insert({
        job_name: 'daily-scrape',
        status: 'failed',
        duration_ms: 0,
        properties_scraped: 0,
        matches_created: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log cron failure:', logError);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
