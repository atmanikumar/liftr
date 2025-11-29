import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyToken } from '@/lib/authMiddleware';

// GET - Get last completed session for a specific program
export async function GET(request, { params }) {
  try {
    const authResult = await verifyToken(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const programId = parseInt(params.programId);

    // Get last session for this program
    const sessions = await query(
      `SELECT ws.*, w.name as workoutName, w.equipmentName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? AND ws.trainingProgramId = ?
       ORDER BY ws.completedAt DESC`,
      [userId, programId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ lastSession: null });
    }

    // Group by workout
    const workoutData = {};
    sessions.forEach(session => {
      if (!workoutData[session.workoutId]) {
        workoutData[session.workoutId] = {
          workoutName: session.workoutName,
          equipmentName: session.equipmentName,
          sets: [],
          unit: session.unit || 'lbs',
        };
      }
      workoutData[session.workoutId].sets.push({
        setNumber: session.setNumber,
        weight: session.weight,
        reps: session.reps,
        rir: session.rir,
      });
    });

    return NextResponse.json({ lastSession: workoutData });
  } catch (error) {
    console.error('Error fetching last session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

