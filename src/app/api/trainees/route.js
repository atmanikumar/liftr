import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const userRole = authResult.user.role;

    // Only trainers and admins can view trainees
    if (userRole !== 'trainer' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users where trainerId matches the current user
    const trainees = await query(
      `SELECT id, username, name, role, lastLogin, createdAt
       FROM liftr_users
       WHERE trainerId = ?
       ORDER BY username ASC`,
      [userId]
    );

    return NextResponse.json({
      trainees,
    });
  } catch (error) {
    console.error('Error fetching trainees:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

