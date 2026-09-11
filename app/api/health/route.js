import { NextResponse } from 'next/server';
import { databasePool } from '../../../lib/db/pool';
import { logger } from '../../../lib/logging/logger';

export async function GET() {
  try {
    await databasePool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    logger.error('health_check_failed', { error });
    return NextResponse.json({ status: 'degraded', database: 'unavailable' }, { status: 503 });
  }
}
