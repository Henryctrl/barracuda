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
    // ✅ REAL DVF API ONLY - no fake fallbacks
    const response = await fetch(
      `https://app.dvf.etalab.gouv.fr/api/recherche?lat=${lat}&lon=${lng}&rayon=${rayon}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Barracuda Property Tool'
        }
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`❌ DVF API failed: ${response.status} ${response.statusText}`)
      return NextResponse.json({ 
        error: `DVF API returned ${response.status}: ${response.statusText}`,
        resultats: []
      }, { status: response.status })
    }

    const data = await response.json()
    console.log(`✅ DVF API success: ${data.resultats?.length || 0} results`)
    
    return NextResponse.json(data)
  } catch (error: unknown) { // ✅ FIX: Explicitly type as unknown
    clearTimeout(timeoutId)
    console.error('❌ DVF API Error:', error)
    
    // ✅ FIX: Safe error handling with type guards
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      
      // Check for specific error types
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'DVF API request timed out',
          resultats: []
        }, { status: 408 })
      }
    }

    // ✅ FIX: Handle non-Error objects safely
    const errorMessage = error instanceof Error ? error.message : 'DVF API is currently unavailable'
    
    return NextResponse.json({ 
      error: errorMessage,
      resultats: []
    }, { status: 503 })
  }
}
