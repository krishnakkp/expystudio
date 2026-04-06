import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('li_token')?.value;
  const urn = request.cookies.get('li_urn')?.value;
  const name = request.cookies.get('li_name')?.value ?? null;
  const picture = request.cookies.get('li_picture')?.value ?? null;
  return NextResponse.json({ connected: !!(token && urn), name, picture });
}
