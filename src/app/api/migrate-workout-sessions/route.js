import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

export async function GET() {
  try {
    // Drop the existing table
    await execute('DROP TABLE IF EXISTS liftr_workout_sessions');

    // Create the new table with correct schema
    await execute(`
      CREATE TABLE liftr_workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER NOT NULL,
        trainingProgramId INTEGER,
        setNumber INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        weightChange REAL DEFAULT 0,
        rir INTEGER DEFAULT 0,
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
      message: 'Successfully migrated liftr_workout_sessions table with setNumber column' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: error.message || 'Migration failed' 
    }, { status: 500 });
  }
}

