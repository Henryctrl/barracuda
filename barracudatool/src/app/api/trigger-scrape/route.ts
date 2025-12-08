// src/app/api/trigger-scrape/route.ts

import { NextRequest, NextResponse } from 'next/server';

const SCRAPER_SERVICE_URL = process.env.RAILWAY_SCRAPER_URL!; // Your Railway URL

export async function POST(request: NextRequest) {
  try {
    const { searchUrl } = await request.json();
    
    if (!searchUrl) {
      return NextResponse.json({ error: 'searchUrl is required' }, { status: 400 });
    }

    console.log('🎯 Triggering scraper for:', searchUrl);

    // Call your Railway scraper service
    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ searchUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ 
        error: 'Scraping failed', 
        details: error 
      }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: `Scraped ${data.stats.total} properties`,
      stats: data.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trigger scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scrape', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Scraper Trigger API',
    usage: 'POST with { "searchUrl": "https://cad-immo.com/fr/ventes" }',
  });
}
