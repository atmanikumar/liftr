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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get all completed workout sessions today (grouped by completedAt timestamp)
    // Each unique completedAt represents a separate workout session
    const completedSessions = await query(
      `SELECT 
         trainingProgramId,
         completedAt,
         COUNT(*) as setCount
       FROM liftr_workout_sessions
       WHERE userId = ? 
       AND DATE(completedAt) = DATE(?)
       AND trainingProgramId IS NOT NULL
       GROUP BY trainingProgramId, completedAt
       ORDER BY completedAt DESC`,
      [userId, today]
    );

    return NextResponse.json({ 
      completedSessions
    });
  } catch (error) {
    console.error('Error fetching today completed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

