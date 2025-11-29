import { NextResponse } from 'next/server';
import { execute, query } from '@/services/database/dbService';

export async function POST() {
  try {
    const userId = 1; // Admin user
    const sessionDate = new Date().toISOString();

    // First, ensure workouts exist and get their IDs
    const workouts = await query('SELECT id, name FROM liftr_workouts');
    const workoutMap = {};
    workouts.forEach(w => {
      workoutMap[w.name] = w.id;
    });

    // Get the "Leg Day - Quad Focused" program ID
    const programs = await query('SELECT id, name FROM liftr_training_programs WHERE name = ?', ['Leg Day - Quad Focused']);
    const programId = programs.length > 0 ? programs[0].id : null;

    // Workout session data based on user's input
    const workoutSessions = [
      {
        workoutName: 'Leg Extension',
        sets: 2,
        reps: [10, 10],
        weight: ['50kg', '55kg'],
        rir: [0, 0],
        notes: 'Set 1: 50kgs, 10 reps, RIR 0\nSet 2: 55kgs, 10 reps, RIR 0'
      },
      {
        workoutName: 'Leg Curl',
        sets: 2,
        reps: [12, 12],
        weight: ['30kg', '40kg'],
        rir: [4, 2],
        notes: 'Set 1: 30kgs, 12 reps, RIR 4\nSet 2: 40kgs, 12 reps, RIR 2'
      },
      {
        workoutName: 'Hack Squat',
        sets: 2,
        reps: [10, 10],
        weight: ['45lbs', '55lbs'],
        rir: [0, 0],
        notes: 'Set 1: 45lbs, 10 reps, RIR 0\nSet 2: 55lbs, 10 reps, RIR 0'
      },
      {
        workoutName: 'Leg Press',
        sets: 2,
        reps: [10, 10],
        weight: ['90lbs', '100lbs each'],
        rir: [0, 0],
        notes: 'Set 1: 90lbs, 10 reps, RIR 0\nSet 2: 100lbs each, 10 reps, RIR 0'
      },
      {
        workoutName: 'Bulgarian Split Squats',
        sets: 2,
        reps: [15, 15],
        weight: ['bodyweight', 'bodyweight'],
        rir: [null, null],
        notes: '15 reps × 2 sets'
      },
      {
        workoutName: 'Calf Raise',
        sets: 2,
        reps: [12, 12],
        weight: ['70lbs', '70lbs'],
        rir: [2, 2],
        notes: 'Set 1: 70lbs, 12 reps, RIR 2\nSet 2: 70lbs, 12 reps, RIR 2'
      },
    ];

    // Insert each workout session
    const insertedSessions = [];
    for (const session of workoutSessions) {
      const workoutId = workoutMap[session.workoutName];
      
      if (!workoutId) {
        console.warn(`Workout not found: ${session.workoutName}`);
        continue;
      }

      const result = await execute(
        `INSERT INTO liftr_workout_sessions 
         (userId, workoutId, trainingProgramId, sets, reps, weight, rir, notes, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          workoutId,
          programId,
          session.sets,
          JSON.stringify(session.reps),
          JSON.stringify(session.weight),
          JSON.stringify(session.rir),
          session.notes,
          sessionDate,
        ]
      );

      insertedSessions.push({
        workout: session.workoutName,
        sessionId: Number(result.lastInsertRowid),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedSessions.length} workout sessions for Leg Day - Quad Focused`,
      sessions: insertedSessions,
      programId: programId,
    });
  } catch (error) {
    console.error('Seed workout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed workout session' },
      { status: 500 }
    );
  }
}

