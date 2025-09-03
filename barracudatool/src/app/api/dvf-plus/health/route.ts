// barracudatool/src/app/api/dvf-plus/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  // Tiny bbox around 48.8566, 2.3522 (~1km)
  const bbox = '2.3392,48.8476,2.3652,48.8656';
  const limit = 5;

  // Adjust base/paths per Cerema “API données foncières” docs if needed
  const BASE_URL = 'https://api.datafoncier.cerema.fr';
  const url = `${BASE_URL}/dvfplus/mutations?bbox=${encodeURIComponent(bbox)}&limit=${limit}`;

  try {
    const started = Date.now();
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    const elapsedMs = Date.now() - started;
    const text = await resp.text();

    // Try parse JSON; if fails, return raw
    let payload: { data?: unknown[] } | unknown[] | null = null;
    try {
      payload = JSON.parse(text);
    } catch {
      // If parsing fails, payload remains null
    }

    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];

    const sample = rows?.slice?.(0, 1) ?? [];

    return NextResponse.json({
      ok: resp.ok,
      status: resp.status,
      elapsed_ms: elapsedMs,
      endpoint: url,
      content_type: resp.headers.get('content-type') || null,
      count: Array.isArray(rows) ? rows.length : null,
      sample,
      raw_preview: payload ? undefined : text?.slice(0, 500),
    }, { status: 200 });
  } catch (e) {
    clearTimeout(timeoutId);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      error: errorMessage,
      endpoint: url,
      hint: 'If this is ECONNREFUSED/ENOTFOUND, check network/DNS/TLS and confirm base path.',
    }, { status: 200 });
  }
}
