import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// Increase timeout for this endpoint
export const maxDuration = 15;

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
    // Supports: "17", "April", "2025", "Nov 30", "2024-11-30", etc.
    if (searchDate) {
      // Try to match various date formats
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

    // Get total count (use simple count, not DISTINCT which is slow)
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM liftr_workout_sessions
       WHERE userId = ?`,
      [userId]
    );

    const total = countResult[0]?.total || 0;

    // OPTIMIZED: Fetch only specific columns and LIMIT the query
    // Get only last 1000 sessions max (enough for pagination)
    const maxRows = 1000;
    const allSessions = await query(
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
       WHERE ${whereClause}
       ORDER BY ws.completedAt DESC
       LIMIT ?`,
      [...params, maxRows]
    );

    // Group all sessions first
    const allGroupedSessions = {};
    allSessions.forEach(session => {
      const key = `${session.sessionDate}_${session.trainingProgramId}_${session.completedAt}`;
      if (!allGroupedSessions[key]) {
        allGroupedSessions[key] = {
          date: session.sessionDate,
          time: session.sessionTime,
          programId: session.trainingProgramId,
          programName: session.programName,
          completedAt: session.completedAt,
          workouts: {},
        };
      }

      if (!allGroupedSessions[key].workouts[session.workoutId]) {
        allGroupedSessions[key].workouts[session.workoutId] = {
          workoutId: session.workoutId,
          workoutName: session.workoutName,
          equipmentName: session.equipmentName,
          muscleFocus: session.muscleFocus,
          sets: [],
        };
      }

      allGroupedSessions[key].workouts[session.workoutId].sets.push({
        setNumber: session.setNumber,
        weight: session.weight,
        weightChange: session.weightChange || 0,
        reps: session.reps,
        rir: session.rir,
        unit: session.unit,
      });
    });

    // Helper function to calculate calories (same as home API)
    const calculateSetCalories = (equipmentName) => {
      const met = equipmentName?.toLowerCase().includes('cardio') ? 8.0 : 6.0;
      const userWeight = 70;
      const durationHours = 2 / 60;
      return met * userWeight * durationHours;
    };

    // Convert to array, calculate muscle distribution, and sort
    const allWorkouts = Object.values(allGroupedSessions)
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

    // Now paginate the grouped sessions
    const paginatedWorkouts = allWorkouts.slice(offset, offset + limit);

    const executionTime = Date.now() - startTime;
    console.log(`[Recent Workouts API] Execution time: ${executionTime}ms, Sessions: ${allSessions.length}, Grouped: ${allWorkouts.length}`);

    return NextResponse.json({
      workouts: paginatedWorkouts,
      pagination: {
        page,
        limit,
        total: allWorkouts.length,
        totalPages: Math.ceil(allWorkouts.length / limit),
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Recent Workouts API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

