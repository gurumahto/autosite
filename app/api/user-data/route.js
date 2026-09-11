import { NextResponse } from 'next/server';
import { z } from 'zod';

const userDataSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  businessName: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  templateId: z.enum(['salon', 'photo-studio']),
});

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const result = userDataSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid business details.', fields: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { message: 'Business details validated.', data: result.data },
    { status: 202 },
  );
}
