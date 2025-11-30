import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';
import { hashPassword } from '@/services/auth/authService';

export async function GET() {
  try {
    // Create liftr_users table
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        lastLogin TEXT
      )
    `);

    // Create liftr_workouts table
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        equipmentName TEXT,
        equipmentPhoto TEXT,
        muscleFocus TEXT,
        description TEXT,
        createdBy INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES liftr_users(id)
      )
    `);

    // Create liftr_training_programs table
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_training_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        workoutIds TEXT NOT NULL,
        description TEXT,
        createdBy INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES liftr_users(id)
      )
    `);

    // Create liftr_workout_sessions table (individual sets, not JSON arrays)
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_workout_sessions (
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

    // Create liftr_active_workouts table to track started but not completed workouts
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_active_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        trainingProgramId INTEGER NOT NULL,
        workoutData TEXT NOT NULL,
        startedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES liftr_users(id),
        FOREIGN KEY (trainingProgramId) REFERENCES liftr_training_programs(id)
      )
    `);

    // Create default admin user if not exists
    const hashedPassword = await hashPassword('admin123');
    try {
      await execute(
        'INSERT INTO liftr_users (username, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator', 'admin']
      );
    } catch (error) {
      // User might already exist, ignore error
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

