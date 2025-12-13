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

    // Get count of times each workout has been completed by this user
    const workoutCounts = await query(
      `SELECT workoutId, COUNT(DISTINCT completedAt) as count
       FROM liftr_workout_sessions
       WHERE userId = ?
       GROUP BY workoutId`,
      [userId]
    );

    // Convert to object for easy lookup
    const counts = {};
    workoutCounts.forEach(wc => {
      counts[wc.workoutId] = wc.count;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Get workout counts error:', error);
    return NextResponse.json(
      { error: 'Failed to get workout counts' },
      { status: 500 }
    );
  }
}

