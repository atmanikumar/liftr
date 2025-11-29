import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(request) {
  try {
    const authResult = await verifyToken(request);
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

    // Calculate improvements
    const improvements = Object.entries(workoutsByExercise).map(([name, data]) => {
      const weights = data.recentWeight.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      const improvement = weights.length > 1 ? 
        weights[0].weight - weights[weights.length - 1].weight : 0;
      
      return {
        exercise: name,
        muscleFocus: data.muscleFocus,
        improvement: improvement,
        currentWeight: weights[0]?.weight || 0,
        sessions: data.count,
      };
    }).filter(i => i.improvement > 0).sort((a, b) => b.improvement - a.improvement);

    // Areas needing work (exercises done infrequently)
    const areasOfImprovement = Object.entries(workoutsByExercise)
      .map(([name, data]) => ({
        exercise: name,
        muscleFocus: data.muscleFocus,
        sessions: data.count,
      }))
      .sort((a, b) => a.sessions - b.sessions)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalWorkouts: Object.keys(workoutsByDate).length,
        totalSets,
        totalReps,
        totalWeight: Math.round(totalWeight),
        exercisesCompleted: Object.keys(workoutsByExercise).length,
      },
      recentSessions: sessions.slice(0, 20),
      workoutsByDate: Object.entries(workoutsByDate).map(([date, data]) => ({
        date,
        programs: Array.from(data.programs),
        sets: data.totalSets,
        exercises: Array.from(data.exercises),
      })).slice(0, 30),
      improvements,
      areasOfImprovement,
      muscleDistribution: Object.entries(workoutsByMuscle).map(([muscle, count]) => ({
        muscle,
        sets: count,
      })).sort((a, b) => b.sets - a.sets),
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

