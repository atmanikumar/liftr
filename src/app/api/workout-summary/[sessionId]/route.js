import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';
import { calculateCalories } from '@/lib/caloriesCalculator';

export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { sessionId } = params; // This is the completedAt timestamp

    // Get all sets from this session
    const sessions = await query(
      `SELECT 
         ws.*,
         w.name as workoutName,
         w.muscleFocus,
         w.equipmentName,
         tp.name as programName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       LEFT JOIN liftr_training_programs tp ON ws.trainingProgramId = tp.id
       WHERE ws.userId = ? 
       AND ws.completedAt = ?
       ORDER BY ws.workoutId, ws.setNumber`,
      [userId, sessionId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Group by workout
    const exercisesMap = {};
    let totalCalories = 0;
    const programId = sessions[0].trainingProgramId;

    sessions.forEach(session => {
      if (!exercisesMap[session.workoutId]) {
        exercisesMap[session.workoutId] = {
          id: session.workoutId,
          name: session.workoutName,
          muscleFocus: session.muscleFocus,
          equipmentName: session.equipmentName,
          sets: [],
          calories: 0,
        };
      }

      // Calculate calories for this set
      const setCalories = calculateCalories(
        session.weight,
        session.reps,
        session.rir,
        session.unit
      );
      totalCalories += setCalories;
      exercisesMap[session.workoutId].calories += setCalories;

      exercisesMap[session.workoutId].sets.push({
        setNumber: session.setNumber,
        weight: session.weight,
        reps: session.reps,
        rir: session.rir,
        unit: session.unit,
        weightChange: session.weightChange || 0,
      });
    });

    const exercises = Object.values(exercisesMap);

    // Get previous session for comparison (if exists)
    let comparison = null;
    if (programId) {
      const previousSessions = await query(
        `SELECT 
           ws.workoutId,
           w.name as workoutName,
           ws.setNumber,
           ws.weight,
           ws.unit,
           ws.completedAt
         FROM liftr_workout_sessions ws
         JOIN liftr_workouts w ON ws.workoutId = w.id
         WHERE ws.userId = ? 
         AND ws.trainingProgramId = ?
         AND ws.completedAt < ?
         ORDER BY ws.completedAt DESC
         LIMIT 100`,
        [userId, programId, sessionId]
      );

      if (previousSessions.length > 0) {
        // Group previous session by workout and get max weight
        const prevWorkoutMaxWeight = {};
        previousSessions.forEach(s => {
          if (!prevWorkoutMaxWeight[s.workoutId] || s.weight > prevWorkoutMaxWeight[s.workoutId].weight) {
            prevWorkoutMaxWeight[s.workoutId] = {
              weight: s.weight,
              unit: s.unit,
              name: s.workoutName,
            };
          }
        });

        // Compare with current session
        const improvements = [];
        const decreases = [];

        exercises.forEach(exercise => {
          const currentMaxWeight = Math.max(...exercise.sets.map(s => s.weight));
          const prevMax = prevWorkoutMaxWeight[exercise.id];

          if (prevMax && prevMax.weight !== currentMaxWeight) {
            if (currentMaxWeight > prevMax.weight) {
              improvements.push({
                exercise: exercise.name,
                increase: currentMaxWeight - prevMax.weight,
                unit: exercise.sets[0].unit,
              });
            } else {
              decreases.push({
                exercise: exercise.name,
                decrease: prevMax.weight - currentMaxWeight,
                unit: exercise.sets[0].unit,
              });
            }
          }
        });

        comparison = {
          hasComparison: true,
          improvements,
          decreases,
        };
      }
    }

    return NextResponse.json({
      workout: {
        programName: sessions[0].programName || 'Workout',
        completedAt: sessionId,
      },
      exercises,
      totalCalories,
      comparison,
    });
  } catch (error) {
    console.error('Error fetching workout summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

