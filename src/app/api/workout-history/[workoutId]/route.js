import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Get last 5 completed sessions for a specific workout/exercise
export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const workoutId = parseInt(params.workoutId);

    // Get last 5 sessions for this specific exercise
    // Group by completedAt to get distinct sessions
    const sessions = await query(
      `SELECT ws.*, w.name as workoutName, w.equipmentName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.workoutId = ?
       ORDER BY ws.completedAt DESC
       LIMIT 100`,
      [userId, workoutId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Group by completedAt (session timestamp) - get last 5 unique sessions
    const sessionsByDate = {};
    sessions.forEach(set => {
      if (!sessionsByDate[set.completedAt]) {
        sessionsByDate[set.completedAt] = {
          completedAt: set.completedAt,
          unit: set.unit || 'lbs',
          sets: [],
        };
      }
      sessionsByDate[set.completedAt].sets.push({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
      });
    });

    // Get last 5 sessions and calculate max weight and total reps per session
    const history = Object.values(sessionsByDate)
      .slice(0, 5)
      .reverse() // Oldest first for chart
      .map((session, index) => {
        const maxWeight = Math.max(...session.sets.map(s => s.weight));
        const totalReps = session.sets.reduce((sum, s) => sum + s.reps, 0);
        const avgReps = Math.round(totalReps / session.sets.length);
        
        return {
          sessionNumber: index + 1,
          date: new Date(session.completedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          maxWeight: maxWeight,
          avgReps: avgReps,
          totalReps: totalReps,
          unit: session.unit,
          sets: session.sets,
        };
      });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



