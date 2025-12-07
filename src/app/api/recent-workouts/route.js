import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// Increase timeout for this complex endpoint
export const maxDuration = 20;

export async function GET(request) {
  const startTime = Date.now();
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchDate = searchParams.get('date') || '';
    const offset = (page - 1) * limit;

    let whereClause = 'ws.userId = ?';
    const params = [userId];

    // Add free text date filter if provided
    if (searchDate) {
      whereClause += ` AND (
        DATE(ws.completedAt) LIKE ? 
        OR strftime('%d', ws.completedAt) = ?
        OR strftime('%m', ws.completedAt) = ?
        OR strftime('%Y', ws.completedAt) = ?
        OR strftime('%Y-%m-%d', ws.completedAt) LIKE ?
      )`;
      const searchPattern = `%${searchDate}%`;
      params.push(searchPattern, searchDate, searchDate, searchDate, searchPattern);
    }

    // CRITICAL OPTIMIZATION: Get distinct session keys with pagination FIRST
    // This prevents fetching ALL sessions when we only need a page worth
    const distinctSessionKeysQuery = `
      SELECT DISTINCT DATE(ws.completedAt) || '_' || ws.trainingProgramId || '_' || ws.completedAt as sessionKey, ws.completedAt
      FROM liftr_workout_sessions ws
      WHERE ${whereClause}
      ORDER BY ws.completedAt DESC
      LIMIT ? OFFSET ?
    `;
    const distinctSessionKeys = await query(distinctSessionKeysQuery, [...params, limit, offset]);

    if (distinctSessionKeys.length === 0) {
      return NextResponse.json({ 
        workouts: [], 
        pagination: { page, limit, total: 0, totalPages: 0 } 
      });
    }

    // Get the session key values for the IN clause
    const sessionKeyValues = distinctSessionKeys.map(row => row.sessionKey);
    const sessionKeyPlaceholders = sessionKeyValues.map(() => '?').join(',');

    // Now fetch ONLY the sessions for these specific session keys
    const allSessionsForPage = await query(
      `SELECT
        ws.workoutId,
        ws.trainingProgramId,
        ws.setNumber,
        ws.weight,
        ws.weightChange,
        ws.reps,
        ws.rir,
        ws.unit,
        ws.completedAt,
        w.name as workoutName,
        w.equipmentName,
        w.muscleFocus,
        tp.name as programName,
        DATE(ws.completedAt) as sessionDate,
        TIME(ws.completedAt) as sessionTime
       FROM liftr_workout_sessions ws
       INNER JOIN liftr_workouts w ON ws.workoutId = w.id
       LEFT JOIN liftr_training_programs tp ON ws.trainingProgramId = tp.id
       WHERE ws.userId = ? AND (DATE(ws.completedAt) || '_' || ws.trainingProgramId || '_' || ws.completedAt) IN (${sessionKeyPlaceholders})
       ORDER BY ws.completedAt DESC, ws.trainingProgramId, ws.workoutId, ws.setNumber`,
      [userId, ...sessionKeyValues]
    );

    // Group sessions by sessionKey
    const groupedSessions = {};
    allSessionsForPage.forEach(session => {
      const key = `${session.sessionDate}_${session.trainingProgramId}_${session.completedAt}`;
      if (!groupedSessions[key]) {
        groupedSessions[key] = {
          date: session.sessionDate,
          time: session.sessionTime,
          programId: session.trainingProgramId,
          programName: session.programName,
          completedAt: session.completedAt,
          workouts: {},
        };
      }

      if (!groupedSessions[key].workouts[session.workoutId]) {
        groupedSessions[key].workouts[session.workoutId] = {
          workoutId: session.workoutId,
          workoutName: session.workoutName,
          equipmentName: session.equipmentName,
          muscleFocus: session.muscleFocus,
          sets: [],
        };
      }

      groupedSessions[key].workouts[session.workoutId].sets.push({
        setNumber: session.setNumber,
        weight: session.weight,
        weightChange: session.weightChange || 0,
        reps: session.reps,
        rir: session.rir,
        unit: session.unit,
      });
    });

    // Helper function to calculate calories
    const calculateSetCalories = (equipmentName) => {
      const met = equipmentName?.toLowerCase().includes('cardio') ? 8.0 : 6.0;
      const userWeight = 70;
      const durationHours = 2 / 60;
      return met * userWeight * durationHours;
    };

    // Convert to array and calculate stats
    const workouts = Object.values(groupedSessions)
      .map(session => {
        const workoutsArray = Object.values(session.workouts);
        
        // Calculate muscle distribution
        const muscleCount = {};
        let totalSets = 0;
        let totalCalories = 0;
        
        workoutsArray.forEach(workout => {
          totalSets += workout.sets.length;
          totalCalories += workout.sets.length * calculateSetCalories(workout.equipmentName);
          
          if (workout.muscleFocus) {
            muscleCount[workout.muscleFocus] = (muscleCount[workout.muscleFocus] || 0) + workout.sets.length;
          }
        });
        
        const muscleDistribution = Object.entries(muscleCount).map(([muscle, count]) => ({
          muscle,
          count
        }));
        
        return {
          sessionId: session.completedAt,
          date: session.date,
          time: session.time,
          programId: session.programId,
          programName: session.programName,
          completedAt: session.completedAt,
          workouts: workoutsArray,
          muscleDistribution,
          totalSets,
          totalCalories: Math.round(totalCalories),
        };
      })
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Get total count for pagination (simplified)
    const totalCountResult = await query(
      `SELECT COUNT(DISTINCT DATE(ws.completedAt) || '_' || ws.trainingProgramId || '_' || ws.completedAt) as total
       FROM liftr_workout_sessions ws
       WHERE ${whereClause}`,
      params
    );
    const total = totalCountResult[0]?.total || 0;

    const executionTime = Date.now() - startTime;
    console.log(`[Recent Workouts API] Execution time: ${executionTime}ms, Page: ${page}, Sessions fetched: ${allSessionsForPage.length}, Grouped: ${workouts.length}`);

    return NextResponse.json({
      workouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Recent Workouts API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

