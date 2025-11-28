import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/constants/app';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the auth cookie
    response.cookies.delete(COOKIE_NAME);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

