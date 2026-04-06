import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  const clientFormData = await request.formData();

  const buildServerForm = () => {
    const form = new FormData();
    form.append('model', clientFormData.get('model') as string);
    form.append('prompt', clientFormData.get('prompt') as string);
    form.append('n', clientFormData.get('n') as string);
    form.append('size', clientFormData.get('size') as string);
    form.append('quality', clientFormData.get('quality') as string);
    const images = clientFormData.getAll('image[]');
    for (const image of images) {
      form.append('image[]', image as Blob);
    }
    return form;
  };

  let resp = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: buildServerForm(),
  });

  if (resp.status === 429) {
    await new Promise((r) => setTimeout(r, 10_000));
    resp = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: buildServerForm(),
    });
  }

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
