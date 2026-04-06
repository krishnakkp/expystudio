import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const ownerUrn = request.cookies.get('li_urn')?.value;

  if (!token || !ownerUrn) {
    return NextResponse.json({ error: 'Not connected to LinkedIn' }, { status: 401 });
  }

  const formData = await request.formData();
  const imageBlob = formData.get('image') as Blob | null;
  if (!imageBlob) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  // Step 1: Register upload slot with LinkedIn
  const regResp = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: ownerUrn,
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
      },
    }),
  });

  if (!regResp.ok) {
    const errText = await regResp.text();
    return NextResponse.json(
      { error: `LinkedIn registerUpload failed (${regResp.status}): ${errText}` },
      { status: regResp.status },
    );
  }

  const regData = await regResp.json();
  const uploadUrl: string | undefined =
    regData.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]?.uploadUrl;
  const assetUrn: string | undefined = regData.value?.asset;

  if (!uploadUrl || !assetUrn) {
    return NextResponse.json(
      { error: 'LinkedIn did not return an upload URL' },
      { status: 502 },
    );
  }

  // Step 2: Upload binary directly (no base64 overhead)
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': imageBlob.type || 'image/png',
    },
    body: await imageBlob.arrayBuffer(),
  });

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    return NextResponse.json(
      { error: `LinkedIn image upload failed (${uploadResp.status}): ${errText}` },
      { status: uploadResp.status },
    );
  }

  return NextResponse.json({ assetUrn });
}
