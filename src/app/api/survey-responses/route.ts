import { NextResponse } from 'next/server';
import { createServiceClient } from '@/util/supabase/service';

type Body = {
  full_name?: string;
  email?: string;
  company_name?: string;
  q1_overall_satisfaction?: number;
  q2_content_quality?: number;
  q3_event_experience?: number;
  q4_recommend_likelihood?: number;
  q5_expectations_met?: number;
  events_id?: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function rating(n: unknown) {
  return typeof n === 'number' && n >= 1 && n <= 5;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const full_name = String(body.full_name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const company_name = String(body.company_name ?? '').trim();
  if (!full_name || !email || !company_name) {
    return NextResponse.json({ error: 'full_name, email, and company_name are required' }, { status: 400 });
  }

  const q1 = body.q1_overall_satisfaction;
  const q2 = body.q2_content_quality;
  const q3 = body.q3_event_experience;
  const q4 = body.q4_recommend_likelihood;
  const q5 = body.q5_expectations_met;
  if (!rating(q1) || !rating(q2) || !rating(q3) || !rating(q4) || !rating(q5)) {
    return NextResponse.json({ error: 'Each question (q1–q5) must be an integer from 1 to 5' }, { status: 400 });
  }

  const eventsIdRaw = body.events_id ?? process.env.SURVEY_EVENTS_UUID ?? process.env.NEXT_PUBLIC_EVENTS_UUID;
  const events_id =
    typeof eventsIdRaw === 'string' && eventsIdRaw.trim() && isUuid(eventsIdRaw.trim())
      ? eventsIdRaw.trim()
      : null;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('survey_responses').insert({
      full_name,
      email,
      company_name,
      q1_overall_satisfaction: q1,
      q2_content_quality: q2,
      q3_event_experience: q3,
      q4_recommend_likelihood: q4,
      q5_expectations_met: q5,
      events_id,
    });
    if (error) {
      console.error('[survey-responses]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[survey-responses]', e);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
