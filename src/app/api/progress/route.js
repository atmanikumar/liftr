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

    // OPTIMIZED: Get only necessary columns and limit to last 500 sessions
    const sessions = await query(
      `SELECT ws.workoutId, ws.weight, ws.reps, ws.completedAt,
              w.name as workoutName, w.equipmentName, w.muscleFocus,
              tp.name as programName
       FROM liftr_workout_sessions ws
       INNER JOIN liftr_workouts w ON ws.workoutId = w.id
       LEFT JOIN liftr_training_programs tp ON ws.trainingProgramId = tp.id
       WHERE ws.userId = ?
       ORDER BY ws.completedAt DESC
       LIMIT 500`,
      [userId]
    );

    // Calculate insights
    const workoutsByExercise = {};
    const workoutsByDate = {};
    const workoutsByMuscle = {};
    let totalSets = 0;
    let totalReps = 0;
    let totalWeight = 0;

    sessions.forEach(session => {
      const date = new Date(session.completedAt).toLocaleDateString();
      
      // By exercise
      if (!workoutsByExercise[session.workoutName]) {
        workoutsByExercise[session.workoutName] = {
          count: 0,
          totalSets: 0,
          maxWeight: 0,
          recentWeight: [],
          muscleFocus: session.muscleFocus,
        };
      }
      workoutsByExercise[session.workoutName].count++;
      workoutsByExercise[session.workoutName].totalSets++;
      workoutsByExercise[session.workoutName].maxWeight = Math.max(
        workoutsByExercise[session.workoutName].maxWeight,
        session.weight || 0
      );
      
      // Keep only last 10 weights per exercise
      if (workoutsByExercise[session.workoutName].recentWeight.length < 10) {
        workoutsByExercise[session.workoutName].recentWeight.push({
          weight: session.weight,
          date: session.completedAt,
        });
      }

      // By date
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = {
          programs: new Set(),
          totalSets: 0,
          exercises: new Set(),
        };
      }
      workoutsByDate[date].programs.add(session.programName);
      workoutsByDate[date].totalSets++;
      workoutsByDate[date].exercises.add(session.workoutName);

      // By muscle group
      if (session.muscleFocus) {
        if (!workoutsByMuscle[session.muscleFocus]) {
          workoutsByMuscle[session.muscleFocus] = 0;
        }
        workoutsByMuscle[session.muscleFocus]++;
      }

      // Totals
      totalSets++;
      totalReps += session.reps || 0;
      totalWeight += (session.weight || 0) * (session.reps || 0);
    });

    // Prepare chart data - workouts per day (last 30 days)
    const last30Days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      
      const dayData = workoutsByDate[dateStr];
      last30Days.push({
        date: dateStr,
        shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
        workouts: dayData ? dayData.exercises.size : 0,
        sets: dayData?.totalSets || 0,
        // Simplified calories: 15 per set
        calories: dayData ? dayData.totalSets * 15 : 0,
      });
    }

    // Get recent achievements (limit 100)
    const achievements = await query(
      `SELECT * FROM liftr_achievements 
       WHERE userId = ?
       ORDER BY achievedAt DESC
       LIMIT 100`,
      [userId]
    );

    const executionTime = Date.now() - startTime;
    console.log(`[Progress API] Execution time: ${executionTime}ms, Sessions: ${sessions.length}`);

    return NextResponse.json({
      summary: {
        totalWorkouts: Object.keys(workoutsByDate).length,
        totalSets,
        totalReps,
        totalWeight: Math.round(totalWeight),
        exercisesCompleted: Object.keys(workoutsByExercise).length,
      },
      chartData: {
        workoutsPerDay: last30Days,
      },
      workoutsByDate: Object.entries(workoutsByDate)
        .map(([date, data]) => ({
          date,
          programs: Array.from(data.programs),
          sets: data.totalSets,
          exercises: Array.from(data.exercises),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 30),
      muscleDistribution: Object.entries(workoutsByMuscle)
        .map(([muscle, count]) => ({
          muscle,
          sets: count,
        }))
        .sort((a, b) => b.sets - a.sets),
      achievements,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Progress API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
