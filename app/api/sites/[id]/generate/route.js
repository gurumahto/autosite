import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '../../../../../lib/db/pool';
import { logger } from '../../../../../lib/logging/logger';

const identifierSchema = z.string().regex(/^\d+$/);
const idempotencyKeySchema = z.string().trim().min(8).max(200);

function getAuthorizedUserId(request) {
  const result = identifierSchema.safeParse(request.headers.get('x-user-id'));
  return result.success ? result.data : null;
}

export async function POST(request, { params }) {
  const userId = getAuthorizedUserId(request);
  const { id } = await params;
  const idempotencyKey = request.headers.get('idempotency-key');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  }
  if (!identifierSchema.safeParse(id).success || !idempotencyKeySchema.safeParse(idempotencyKey).success) {
    return NextResponse.json({ error: 'A valid site ID and Idempotency-Key are required.' }, { status: 400 });
  }

  try {
    const job = await withTransaction(async (client) => {
      const websiteResult = await client.query(
        `SELECT website_id, status
         FROM websites
         WHERE website_id = $1 AND user_id = $2
         FOR UPDATE`,
        [id, userId],
      );
      const website = websiteResult.rows[0];

      if (!website) {
        const error = new Error('SITE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }

      const existingJobResult = await client.query(
        `SELECT generation_job_id, website_id, status, correlation_id
         FROM generation_jobs
         WHERE idempotency_key = $1 AND website_id = $2`,
        [idempotencyKey, id],
      );
      if (existingJobResult.rows[0]) {
        return { ...existingJobResult.rows[0], reused: true };
      }

      if (!['Draft', 'Failed'].includes(website.status)) {
        const error = new Error('SITE_NOT_BUILDABLE');
        error.statusCode = 409;
        throw error;
      }

      const correlationId = crypto.randomUUID();
      const jobResult = await client.query(
        `INSERT INTO generation_jobs (website_id, idempotency_key, correlation_id)
         VALUES ($1, $2, $3)
         RETURNING generation_job_id, website_id, status, correlation_id`,
        [id, idempotencyKey, correlationId],
      );
      await client.query(
        `UPDATE websites
         SET status = 'Building', failure_reason = NULL, build_started_at = CURRENT_TIMESTAMP,
             build_completed_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $1`,
        [id],
      );

      return { ...jobResult.rows[0], reused: false };
    });

    return NextResponse.json({ job }, { status: job.reused ? 200 : 202 });
  } catch (error) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message === 'SITE_NOT_FOUND' ? 'Site not found.' : 'Site is not ready to generate.' }, { status: error.statusCode });
    }
    logger.error('generation_job_creation_failed', { error });
    return NextResponse.json({ error: 'Generation could not be started.' }, { status: 503 });
  }
}
