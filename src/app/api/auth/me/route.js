import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryOne } from '@/services/database/dbService';
import { verifyToken, getSafeUserData } from '@/services/auth/authService';
import { COOKIE_NAME } from '@/constants/app';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const user = await queryOne(
      'SELECT * FROM liftr_users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: getSafeUserData(user),
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}

