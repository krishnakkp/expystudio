import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const ownerUrn = request.cookies.get('li_urn')?.value;

  if (!token || !ownerUrn) {
    return NextResponse.json({ error: 'Not connected to LinkedIn' }, { status: 401 });
  }

  const { caption, assetUrns } = (await request.json()) as {
    caption: string;
    assetUrns: string[];
  };

  const postBody = {
    author: ownerUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: caption },
        shareMediaCategory: assetUrns.length > 0 ? 'IMAGE' : 'NONE',
        ...(assetUrns.length > 0 && {
          media: assetUrns.map((urn) => ({ status: 'READY', media: urn })),
        }),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const postResp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  if (!postResp.ok) {
    const errText = await postResp.text();
    return NextResponse.json(
      { error: `LinkedIn ugcPosts failed (${postResp.status}): ${errText}` },
      { status: postResp.status },
    );
  }

  // LinkedIn may return the created URN in either response body (`id`)
  // or `x-restli-id` header depending on endpoint behavior.
  const rawBody = await postResp.text();
  let postId: string | undefined;
  if (rawBody) {
    try {
      const postData = JSON.parse(rawBody) as { id?: string };
      postId = postData.id;
    } catch {
      // Ignore non-JSON body; we'll still try header-based ID.
    }
  }
  postId = postId ?? postResp.headers.get('x-restli-id') ?? undefined;

  // Prefer UGC permalink format. Activity links built from UGC IDs are often invalid.
  // Keep feed URL as reliable fallback so users always land in LinkedIn.
  const fallbackUrl = 'https://www.linkedin.com/feed/';
  let postUrl = fallbackUrl;
  if (postId) {
    const urn = postId.startsWith('urn:') ? postId : `urn:li:ugcPost:${postId}`;
    postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
  }

  return NextResponse.json({ success: true, id: postId ?? null, postUrl, fallbackUrl });
}
