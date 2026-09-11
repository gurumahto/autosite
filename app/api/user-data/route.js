import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '../../../../lib/db/pool';
import { logger } from '../../../../lib/logging/logger';

const userDataSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  businessName: z.string().trim().min(1).max(160),
  businessType: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  templateId: z.enum(['salon', 'photo-studio']),
});

const templateDefinitions = {
  salon: { name: 'SalonBusinessTemplate', category: 'Salon', location: 'templates/SalonBusinessTemplate.jsx' },
  'photo-studio': { name: 'PhotoStudioBusinessTemplate', category: 'Photography', location: 'templates/PhotoStudioBusinessTemplate.jsx' },
};

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const result = userDataSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid business details.', fields: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const persisted = await withTransaction(async (client) => {
      const data = result.data;
      const template = templateDefinitions[data.templateId];
      const userResult = await client.query(
        `INSERT INTO users (name, email, phone_no)
         VALUES ($1, $2, NULLIF($3, ''))
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           phone_no = EXCLUDED.phone_no,
           updated_at = CURRENT_TIMESTAMP
         RETURNING user_id`,
        [data.name, data.email, data.phone ?? ''],
      );
      const templateResult = await client.query(
        `INSERT INTO templates (name, category, version, location)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, version) DO UPDATE SET is_active = TRUE
         RETURNING template_id`,
        [template.name, template.category, '1.0.0', template.location],
      );
      const userDataResult = await client.query(
        `INSERT INTO user_data (user_id, business_name, business_type, business_description, template_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_data_id`,
        [userResult.rows[0].user_id, data.businessName, data.businessType, data.description, templateResult.rows[0].template_id],
      );
      const websiteResult = await client.query(
        `INSERT INTO websites (user_id, user_data_id, template_id)
         VALUES ($1, $2, $3)
         RETURNING website_id, status`,
        [userResult.rows[0].user_id, userDataResult.rows[0].user_data_id, templateResult.rows[0].template_id],
      );

      return websiteResult.rows[0];
    });

    return NextResponse.json({ message: 'Business details saved.', site: persisted }, { status: 201 });
  } catch (error) {
    logger.error('user_data_persistence_failed', { error });
    return NextResponse.json({ error: 'Business details could not be saved.' }, { status: 503 });
  }
}
