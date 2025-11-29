import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessions } = await request.json();
    
    if (!sessions || !Array.isArray(sessions)) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    const userId = authResult.user.id;
    const insertedSessions = [];

    // Insert each workout session
    for (const session of sessions) {
      const result = await execute(
        `INSERT INTO liftr_workout_sessions 
         (userId, workoutId, trainingProgramId, sets, reps, weight, rir, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          session.workoutId,
          session.trainingProgramId,
          session.sets,
          JSON.stringify(session.reps),
          JSON.stringify(session.weight),
          JSON.stringify(session.rir),
          session.completedAt,
        ]
      );

      insertedSessions.push({
        sessionId: Number(result.lastInsertRowid),
        workoutId: session.workoutId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${insertedSessions.length} workout sessions`,
      sessions: insertedSessions,
    });
  } catch (error) {
    console.error('Save workout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save workout session' },
      { status: 500 }
    );
  }
}

