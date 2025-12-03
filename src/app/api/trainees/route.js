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

    let trainees;
    
    // Admins can see all users, trainers only see their trainees
    if (userRole === 'admin') {
      trainees = await query(
        `SELECT id, username, name, role, lastLogin, createdAt, trainerId
         FROM liftr_users
         WHERE role = 'user'
         ORDER BY username ASC`
      );
    } else {
      // Get all users where trainerId matches the current user
      trainees = await query(
        `SELECT id, username, name, role, lastLogin, createdAt, trainerId
         FROM liftr_users
         WHERE trainerId = ?
         ORDER BY username ASC`,
        [userId]
      );
    }

    return NextResponse.json({
      trainees,
    });
  } catch (error) {
    console.error('Error fetching trainees:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


