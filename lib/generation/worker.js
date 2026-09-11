import crypto from 'node:crypto';
import { databasePool, withTransaction } from '../db/pool';
import { putObject } from '../storage/provider';
import { renderSiteArchive } from './render-site';
import { logger } from '../logging/logger';

const maxAttempts = Math.max(1, Number.parseInt(process.env.MAX_GENERATION_ATTEMPTS || '3', 10));

async function claimJob() {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT gj.generation_job_id, gj.website_id, w.user_id, gj.attempt_count, gj.correlation_id,
              ud.business_name, ud.business_type, ud.business_description,
              t.location AS template_location
       FROM generation_jobs gj
       JOIN websites w ON w.website_id = gj.website_id
       JOIN user_data ud ON ud.user_data_id = w.user_data_id
       JOIN templates t ON t.template_id = w.template_id
       WHERE gj.status = 'Queued'
       ORDER BY gj.created_at
       FOR UPDATE OF gj SKIP LOCKED
       LIMIT 1`,
    );
    const job = result.rows[0];
    if (!job) return null;

    await client.query(
      `UPDATE generation_jobs
       SET status = 'Running', attempt_count = attempt_count + 1, started_at = CURRENT_TIMESTAMP
       WHERE generation_job_id = $1`,
      [job.generation_job_id],
    );
    return job;
  });
}

export async function processNextGenerationJob() {
  const job = await claimJob();
  if (!job) return { processed: false };
  logger.info('generation_job_started', {
    jobId: job.generation_job_id,
    siteId: job.website_id,
    correlationId: job.correlation_id,
    attempt: job.attempt_count + 1,
  });

  try {
    const archive = await renderSiteArchive(job);
    const artifactKey = `users/${job.user_id}/sites/${job.website_id}/artifacts/${job.generation_job_id}-${crypto.randomUUID()}.zip`;
    await putObject(artifactKey, archive);

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE generation_jobs
         SET status = 'Succeeded', completed_at = CURRENT_TIMESTAMP, error_message = NULL
         WHERE generation_job_id = $1`,
        [job.generation_job_id],
      );
      await client.query(
        `UPDATE websites
         SET status = 'Ready', artifact_key = $1, build_completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $2`,
        [artifactKey, job.website_id],
      );
    });

    logger.info('generation_job_succeeded', {
      jobId: job.generation_job_id,
      siteId: job.website_id,
      correlationId: job.correlation_id,
    });
    return { processed: true, status: 'Succeeded', jobId: job.generation_job_id };
  } catch (error) {
    const nextStatus = job.attempt_count + 1 < maxAttempts ? 'Queued' : 'Failed';
    logger.error('generation_job_attempt_failed', {
      jobId: job.generation_job_id,
      siteId: job.website_id,
      correlationId: job.correlation_id,
      attempt: job.attempt_count + 1,
      maxAttempts,
      error,
    });
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE generation_jobs
         SET status = $1, completed_at = CASE WHEN $1 = 'Failed' THEN CURRENT_TIMESTAMP ELSE NULL END,
             error_message = $2
           WHERE generation_job_id = $3`,
        [nextStatus, 'Generation failed.', job.generation_job_id],
      );
      await client.query(
        `UPDATE websites
         SET status = $1, failure_reason = CASE WHEN $1 = 'Failed' THEN $2 ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
           WHERE website_id = $3`,
        [nextStatus === 'Failed' ? 'Failed' : 'Building', 'Website generation failed.', job.website_id],
      );
    });
    return { processed: true, status: nextStatus, jobId: job.generation_job_id };
  }
}

export async function hasQueuedGenerationJob() {
  const result = await databasePool.query("SELECT 1 FROM generation_jobs WHERE status = 'Queued' LIMIT 1");
  return Boolean(result.rows[0]);
}
