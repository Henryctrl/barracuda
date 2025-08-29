import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const rayon = searchParams.get('rayon') || '2000'

  console.log(`🔥 DVF+ API called: lat=${lat}, lng=${lng}, rayon=${rayon}`)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    // ✅ Use DVF+ from Cerema (more reliable in 2025)
    const dvfPlusUrl = `https://apidf-preprod.cerema.fr/dvf_opendata/ventes?lat=${lat}&lon=${lng}&rayon=${rayon}`
    console.log(`📡 Calling DVF+ API: ${dvfPlusUrl}`)
    
    const response = await fetch(dvfPlusUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Barracuda Property Tool)'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`❌ DVF+ API failed: ${response.status} ${response.statusText}`)
      return NextResponse.json({ 
        error: `DVF+ API returned ${response.status}: ${response.statusText}`,
        resultats: []
      }, { status: 200 })
    }

    const data = await response.json()
    console.log(`✅ DVF+ API success: ${data.resultats?.length || 0} results`)
    
    return NextResponse.json({
      ...data,
      status: 'success'
    })
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    console.error('❌ DVF+ API Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'DVF+ API is currently unavailable'
    
    return NextResponse.json({ 
      error: errorMessage,
      resultats: []
    }, { status: 200 })
  }
}
