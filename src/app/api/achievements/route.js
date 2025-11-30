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
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get achievements for this specific session
    const improvements = await query(
      `SELECT * FROM liftr_achievements 
       WHERE userId = ? AND achievedAt = ?
       ORDER BY exerciseName`,
      [userId, sessionId]
    );

    // Get decreases by comparing session data with previous sessions
    const sessionWorkouts = await query(
      `SELECT ws.*, w.name as workoutName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? AND ws.completedAt = ?`,
      [userId, sessionId]
    );

    const decreases = [];
    const workoutMaxWeights = {};

    // Group by workout and get max weight
    sessionWorkouts.forEach(s => {
      if (!workoutMaxWeights[s.workoutId]) {
        workoutMaxWeights[s.workoutId] = {
          name: s.workoutName,
          maxWeight: s.weight,
          unit: s.unit,
        };
      } else if (s.weight > workoutMaxWeights[s.workoutId].maxWeight) {
        workoutMaxWeights[s.workoutId].maxWeight = s.weight;
      }
    });

    // Fetch all previous max weights in one query (avoid N+1)
    const workoutIds = Object.keys(workoutMaxWeights);
    
    if (workoutIds.length > 0) {
      const previousMaxWeights = await query(
        `SELECT workoutId, MAX(weight) as maxWeight
         FROM liftr_workout_sessions
         WHERE userId = ? AND workoutId IN (${workoutIds.map(() => '?').join(',')}) AND completedAt < ?
         GROUP BY workoutId`,
        [userId, ...workoutIds, sessionId]
      );

      // Create a map for O(1) lookups
      const prevMaxMap = {};
      previousMaxWeights.forEach(pm => {
        prevMaxMap[pm.workoutId] = pm.maxWeight;
      });

      // Check for decreases
      for (const [workoutId, current] of Object.entries(workoutMaxWeights)) {
        const previousMax = prevMaxMap[workoutId];
        
        if (previousMax && current.maxWeight < previousMax) {
          decreases.push({
            exercise: current.name,
            previousWeight: previousMax,
            newWeight: current.maxWeight,
            decrease: previousMax - current.maxWeight,
            unit: current.unit,
          });
        }
      }
    }

    return NextResponse.json({
      improvements,
      decreases,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

