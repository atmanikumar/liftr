import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Get last completed session for a specific workout/exercise
export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const workoutId = parseInt(params.workoutId);

    // Get last session for this specific exercise
    // Since workoutId is already specific to a particular exercise, we don't need
    // additional filtering - just get the most recent session for this exact workout
    const sessions = await query(
      `SELECT ws.*, w.name as workoutName, w.equipmentName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.workoutId = ?
       ORDER BY ws.completedAt DESC
       LIMIT 10`,
      [userId, workoutId]
    );

    console.log(`[last-exercise] userId=${userId}, workoutId=${workoutId}, found ${sessions.length} sessions`);
    if (sessions.length > 0) {
      console.log(`[last-exercise] First session: weight=${sessions[0].weight}, reps=${sessions[0].reps}, unit=${sessions[0].unit}`);
    }

    if (sessions.length === 0) {
      return NextResponse.json({ lastSession: null });
    }

    // Group sets from the most recent session
    // All sets with the same timestamp should be grouped together
    const lastCompletedAt = sessions[0].completedAt;
    const lastSessionSets = sessions.filter(s => s.completedAt === lastCompletedAt);

    // Only return first 2 sets to prevent extra sets from persisting
    const setsData = lastSessionSets
      .map(set => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
      }))
      .sort((a, b) => a.setNumber - b.setNumber)
      .slice(0, 2); // Only keep first 2 sets

    const exerciseData = {
      workoutName: sessions[0].workoutName,
      equipmentName: sessions[0].equipmentName,
      unit: sessions[0].unit || 'lbs',
      sets: setsData,
    };

    return NextResponse.json({ lastSession: exerciseData });
  } catch (error) {
    console.error('Error fetching last exercise session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

