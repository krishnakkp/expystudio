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

  const postData = await postResp.json();

  // Build a direct link to the post. The ugcPosts API returns an ID like
  // "urn:li:ugcPost:1234567890" — extract the numeric activity ID.
  let postUrl: string | null = null;
  const postId = postData.id as string | undefined;
  if (postId) {
    // Extract the numeric part after the last colon
    const activityId = postId.split(':').pop();
    if (activityId) {
      postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    }
  }

  return NextResponse.json({ success: true, id: postId, postUrl });
}
