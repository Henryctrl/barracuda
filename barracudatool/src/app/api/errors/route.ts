import { NextRequest, NextResponse } from 'next/server';
import { getErrorLogs } from '../../../lib/errorLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const level = searchParams.get('level') as 'error' | 'warning' | 'info' | null;

    const logs = await getErrorLogs(limit, level || undefined);
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
