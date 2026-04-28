import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'Next.js API is working' });
}
