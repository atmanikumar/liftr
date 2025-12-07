import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

/**
 * Query All Sessions - Search both active and archived sessions
 * Use this for historical data lookups that might span beyond retention period
 */

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.user.id;
    const workoutId = searchParams.get('workoutId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId is required' }, { status: 400 });
    }

    // Query both active and archive tables with UNION
    // This allows seamless access to all historical data
    const sessions = await query(
      `SELECT * FROM (
        SELECT id, userId, workoutId, trainingProgramId, setNumber, reps, 
               weight, weightChange, rir, unit, completedAt, 'active' as source
        FROM liftr_workout_sessions
        WHERE userId = ? AND workoutId = ?
        ${startDate ? 'AND completedAt >= ?' : ''}
        ${endDate ? 'AND completedAt <= ?' : ''}
        
        UNION ALL
        
        SELECT id, userId, workoutId, trainingProgramId, setNumber, reps, 
               weight, weightChange, rir, unit, completedAt, 'archive' as source
        FROM liftr_workout_sessions_archive
        WHERE userId = ? AND workoutId = ?
        ${startDate ? 'AND completedAt >= ?' : ''}
        ${endDate ? 'AND completedAt <= ?' : ''}
      )
      ORDER BY completedAt DESC
      LIMIT ?`,
      [
        userId,
        parseInt(workoutId),
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
        userId,
        parseInt(workoutId),
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
        limit,
      ]
    );

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Query all sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query sessions' },
      { status: 500 }
    );
  }
}

