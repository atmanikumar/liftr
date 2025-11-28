/**
 * Authentication middleware for API routes
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { queryOne } from '@/services/database/dbService';
import { verifyToken } from '@/services/auth/authService';
import { COOKIE_NAME } from '@/constants/app';

/**
 * Verify authentication and get current user
 * @returns {Promise<{user: Object} | NextResponse>}
 */
export async function requireAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

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

  return { user };
}

/**
 * Verify admin role
 * @returns {Promise<{user: Object} | NextResponse>}
 */
export async function requireAdmin() {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return authResult;
}

