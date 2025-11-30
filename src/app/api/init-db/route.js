import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';
import { hashPassword } from '@/services/auth/authService';

export async function GET() {
  try {
    // Create liftr_achievements table to track workout improvements
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER NOT NULL,
        exerciseName TEXT NOT NULL,
        previousWeight REAL NOT NULL,
        newWeight REAL NOT NULL,
        improvement REAL NOT NULL,
        unit TEXT NOT NULL,
        achievedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES liftr_users(id),
        FOREIGN KEY (workoutId) REFERENCES liftr_workouts(id)
      )
    `);

    return NextResponse.json({
      success: true,
      message: 'liftr_achievements table created successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

