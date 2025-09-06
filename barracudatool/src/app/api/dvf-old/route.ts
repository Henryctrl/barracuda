import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const rayon = searchParams.get('rayon') || '2000'

  console.log(`🔥 DVF API called: lat=${lat}, lng=${lng}, rayon=${rayon}`)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
  }

  // Implement timeout with AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    // ✅ Updated DVF API endpoint - using the correct URL
    const dvfUrl = `https://app.dvf.etalab.gouv.fr/api/recherche?lat=${lat}&lon=${lng}&rayon=${rayon}`
    console.log(`📡 Calling DVF API: ${dvfUrl}`)
    
    const response = await fetch(dvfUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Barracuda Property Tool)'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`❌ DVF API failed: ${response.status} ${response.statusText}`)
      
      // Return empty results instead of error to prevent app crashes
      return NextResponse.json({ 
        error: `DVF API returned ${response.status}: ${response.statusText}`,
        resultats: [],
        status: 'no_data'
      }, { status: 200 }) // Return 200 to prevent fetch errors in frontend
    }

    const data = await response.json()
    console.log(`✅ DVF API success: ${data.resultats?.length || 0} results`)
    
    return NextResponse.json({
      ...data,
      status: 'success'
    })
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error('❌ DVF API Error:', error)
    
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'DVF API request timed out',
          resultats: [],
          status: 'timeout'
        }, { status: 200 })
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'DVF API is currently unavailable'
    
    return NextResponse.json({ 
      error: errorMessage,
      resultats: [],
      status: 'error'
    }, { status: 200 })
  }
}
