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

    // Get count of times each training program has been completed by this user
    // (unique completedAt timestamps per program)
    const programCounts = await query(
      `SELECT trainingProgramId, COUNT(DISTINCT completedAt) as count
       FROM liftr_workout_sessions
       WHERE userId = ? AND trainingProgramId IS NOT NULL
       GROUP BY trainingProgramId`,
      [userId]
    );

    // Convert to object for easy lookup
    const counts = {};
    programCounts.forEach(pc => {
      counts[pc.trainingProgramId] = pc.count;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Get program counts error:', error);
    return NextResponse.json(
      { error: 'Failed to get program counts' },
      { status: 500 }
    );
  }
}

