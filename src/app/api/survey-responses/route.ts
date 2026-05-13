import { NextRequest, NextResponse } from 'next/server';

import { createServiceClient } from '@/util/supabase/service';

type Body = {
  full_name: string;
  email: string;
  company_name: string;
  q1_overall_satisfaction: number;
  q2_content_quality: number;
  q3_event_experience: number;
  q4_recommend_likelihood: number;
  q5_expectations_met: number;
  /** UUID of `public.events.id` (optional). */
  events_id?: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const full_name = body.full_name?.trim();
    const email = body.email?.trim();
    const company_name = body.company_name?.trim();
    const q = [
      body.q1_overall_satisfaction,
      body.q2_content_quality,
      body.q3_event_experience,
      body.q4_recommend_likelihood,
      body.q5_expectations_met,
    ];

    if (!full_name || !email || !company_name) {
      return NextResponse.json({ error: 'Missing name, email, or company' }, { status: 400 });
    }

    for (let i = 0; i < q.length; i++) {
      const n = q[i];
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: `Invalid rating for q${i + 1}` }, { status: 400 });
      }
    }

    let eventsId: string | null = body.events_id?.trim() || null;
    if (!eventsId) {
      const fromEnv = process.env.SURVEY_EVENTS_UUID?.trim() || process.env.NEXT_PUBLIC_EVENTS_UUID?.trim() || '';
      eventsId = fromEnv || null;
    }
    if (eventsId && !isUuid(eventsId)) {
      return NextResponse.json({ error: 'Invalid events_id (must be UUID)' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        full_name,
        email,
        company_name,
        q1_overall_satisfaction: q[0],
        q2_content_quality: q[1],
        q3_event_experience: q[2],
        q4_recommend_likelihood: q[3],
        q5_expectations_met: q[4],
        events_id: eventsId,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
