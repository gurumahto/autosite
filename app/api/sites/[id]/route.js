import { NextResponse } from 'next/server';
import { z } from 'zod';
import { databasePool } from '../../../lib/db/pool';
import { logger } from '../../../lib/logging/logger';

const identifierSchema = z.string().regex(/^\d+$/);

export async function GET(request, { params }) {
  const userId = request.headers.get('x-user-id');
  const { id } = await params;

  if (!identifierSchema.safeParse(userId).success) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  }
  if (!identifierSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'A valid site ID is required.' }, { status: 400 });
  }

  try {
    const result = await databasePool.query(
      `SELECT
         w.website_id,
         w.status,
         w.website_url,
         w.failure_reason,
         w.created_at,
         w.updated_at,
         w.published_at,
         gj.generation_job_id,
         gj.status AS generation_status,
         gj.attempt_count AS generation_attempt_count,
         dj.deployment_job_id,
         dj.status AS deployment_status,
         dj.attempt_count AS deployment_attempt_count
       FROM websites w
       LEFT JOIN LATERAL (
         SELECT generation_job_id, status, attempt_count
         FROM generation_jobs
         WHERE website_id = w.website_id
         ORDER BY created_at DESC
         LIMIT 1
       ) gj ON TRUE
       LEFT JOIN LATERAL (
         SELECT deployment_job_id, status, attempt_count
         FROM deployment_jobs
         WHERE website_id = w.website_id
         ORDER BY created_at DESC
         LIMIT 1
       ) dj ON TRUE
       WHERE w.website_id = $1 AND w.user_id = $2`,
      [id, userId],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
    }

    return NextResponse.json({ site: result.rows[0] });
  } catch (error) {
    logger.error('site_status_lookup_failed', { error });
    return NextResponse.json({ error: 'Site status is unavailable.' }, { status: 503 });
  }
}
