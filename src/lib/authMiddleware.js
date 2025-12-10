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

/**
 * Verify trainer or admin role
 * @returns {Promise<{user: Object} | NextResponse>}
 */
export async function requireTrainerOrAdmin() {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.role !== 'trainer' && authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Trainer or Admin access required' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Verify authentication from request (supports both cookies and Authorization header)
 * @param {Request} request - The incoming request
 * @param {boolean} updateActivity - Whether to update last activity timestamp (default: true)
 * @returns {Promise<{authenticated: boolean, user: Object}>}
 */
export async function verifyAuth(request, updateActivity = true) {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('Authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fall back to cookie
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) {
      return { authenticated: false, user: null };
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return { authenticated: false, user: null };
    }

    const user = await queryOne(
      'SELECT * FROM liftr_users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return { authenticated: false, user: null };
    }

    // Update last activity timestamp in background (don't await to avoid slowing down requests)
    if (updateActivity) {
      updateLastActivity(user.id).catch(err => {
        // Silent fail - don't block the request if activity update fails
        console.error('Failed to update last activity:', err);
      });
    }

    return { authenticated: true, user };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Update user's last activity timestamp
 * @param {number} userId - The user ID
 * @returns {Promise<void>}
 */
async function updateLastActivity(userId) {
  const { execute } = await import('@/services/database/dbService');
  
  try {
    await execute(
      'UPDATE liftr_users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  } catch (error) {
    // Silent fail - don't throw error
    console.error('Error updating last activity:', error);
  }
}

