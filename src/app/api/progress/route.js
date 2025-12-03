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

    // Get all workout sessions for the user
    const sessions = await query(
      `SELECT ws.*, w.name as workoutName, w.equipmentName, w.muscleFocus,
              tp.name as programName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       LEFT JOIN liftr_training_programs tp ON ws.trainingProgramId = tp.id
       WHERE ws.userId = ?
       ORDER BY ws.completedAt DESC`,
      [userId]
    );

    // Calculate insights
    const workoutsByExercise = {};
    const workoutsByDate = {};
    const workoutsByMuscle = {};
    const workoutSessionsByDate = {}; // Track unique workout sessions by date
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
      workoutsByExercise[session.workoutName].recentWeight.push({
        weight: session.weight,
        date: session.completedAt,
      });

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
      
      // Track unique workout sessions per date
      if (!workoutSessionsByDate[date]) {
        workoutSessionsByDate[date] = new Set();
      }
      workoutSessionsByDate[date].add(session.completedAt);

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
      last30Days.push({
        date: dateStr,
        shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
        workouts: workoutsByDate[dateStr] ? workoutsByDate[dateStr].exercises.size : 0,
        sets: workoutsByDate[dateStr]?.totalSets || 0,
      });
    }

    // Calculate calories per day
    const caloriesByDay = {};
    sessions.forEach(session => {
      const date = new Date(session.completedAt).toLocaleDateString();
      if (!caloriesByDay[date]) {
        caloriesByDay[date] = 0;
      }
      // Simple calorie calculation: (weight * reps * 0.1)
      const calories = (session.weight || 0) * (session.reps || 0) * 0.1;
      caloriesByDay[date] += calories;
    });

    // Add calories to last 30 days data
    last30Days.forEach(day => {
      day.calories = Math.round(caloriesByDay[day.date] || 0);
    });

    // Get all achievements
    const achievements = await query(
      `SELECT * FROM liftr_achievements 
       WHERE userId = ?
       ORDER BY achievedAt DESC
       LIMIT 100`,
      [userId]
    );

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
      workoutsByDate: Object.entries(workoutsByDate).map(([date, data]) => ({
        date,
        programs: Array.from(data.programs),
        sets: data.totalSets,
        exercises: Array.from(data.exercises),
      })).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30),
      muscleDistribution: Object.entries(workoutsByMuscle).map(([muscle, count]) => ({
        muscle,
        sets: count,
      })).sort((a, b) => b.sets - a.sets),
      achievements,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

