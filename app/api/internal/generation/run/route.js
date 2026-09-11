import { NextResponse } from 'next/server';
import { processNextGenerationJob } from '../../../../../lib/generation/worker';
import { logger } from '../../../../../lib/logging/logger';

export async function POST(request) {
  const authorization = request.headers.get('authorization');
  const expected = process.env.WORKER_SECRET;

  if (!expected || authorization !== `Bearer ${expected}`) {
    logger.warn('generation_worker_unauthorized');
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await processNextGenerationJob();
    return NextResponse.json(result, { status: result.processed ? 200 : 204 });
  } catch (error) {
    logger.error('generation_worker_failed', { error });
    return NextResponse.json({ error: 'Worker execution failed.' }, { status: 503 });
  }
}
