import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

export async function POST() {
  try {
    // Drop and recreate the workout_sessions table with the rir column
    await execute('DROP TABLE IF EXISTS liftr_workout_sessions');
    
    await execute(`
      CREATE TABLE liftr_workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER,
        trainingProgramId INTEGER,
        sets INTEGER,
        reps TEXT,
        weight TEXT,
        rir TEXT,
        duration INTEGER,
        notes TEXT,
        completedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES liftr_users(id),
        FOREIGN KEY (workoutId) REFERENCES liftr_workouts(id),
        FOREIGN KEY (trainingProgramId) REFERENCES liftr_training_programs(id)
      )
    `);

    return NextResponse.json({
      success: true,
      message: 'Workout sessions table recreated with RIR column',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate' },
      { status: 500 }
    );
  }
}

