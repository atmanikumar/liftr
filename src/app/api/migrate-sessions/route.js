import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

export async function GET() {
  try {
    // Drop the old table
    await execute(`DROP TABLE IF EXISTS liftr_workout_sessions`);

    // Recreate with new schema
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER,
        trainingProgramId INTEGER,
        setNumber INTEGER,
        reps INTEGER,
        weight REAL,
        rir INTEGER,
        unit TEXT DEFAULT 'lbs',
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
      message: 'Workout sessions table recreated with new schema. Old data has been cleared.',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

