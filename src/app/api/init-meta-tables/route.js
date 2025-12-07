import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

/**
 * Initialize Metadata Tables
 * These lightweight tables replace the need to keep historical workout sessions
 */

export async function POST() {
  try {
    // 1. Workout History Metadata - Last 10 sessions per user per workout
    // This replaces querying thousands of old session rows
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_workout_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER NOT NULL,
        sessionDate TEXT NOT NULL,
        maxWeight REAL NOT NULL,
        avgWeight REAL NOT NULL,
        totalSets INTEGER NOT NULL,
        avgReps REAL NOT NULL,
        avgRir REAL NOT NULL,
        unit TEXT DEFAULT 'lbs',
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, workoutId, sessionDate)
      )
    `);

    // Index for fast lookups
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_workout_meta_user_workout 
      ON liftr_workout_meta(userId, workoutId, sessionDate DESC)
    `);

    // 2. Personal Records (PRs) - Track all-time bests
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        workoutId INTEGER NOT NULL,
        recordType TEXT NOT NULL, -- 'max_weight', 'max_reps', 'max_volume'
        recordValue REAL NOT NULL,
        unit TEXT DEFAULT 'lbs',
        achievedAt TEXT NOT NULL,
        previousRecord REAL,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, workoutId, recordType)
      )
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_personal_records_user 
      ON liftr_personal_records(userId, workoutId)
    `);

    // 3. Weekly Summary Stats - For charts and trends
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_weekly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        weekStart TEXT NOT NULL, -- YYYY-MM-DD (Monday)
        totalWorkouts INTEGER DEFAULT 0,
        totalSets INTEGER DEFAULT 0,
        totalCalories INTEGER DEFAULT 0,
        musclesWorked TEXT, -- JSON array
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, weekStart)
      )
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_weekly_stats_user_week 
      ON liftr_weekly_stats(userId, weekStart DESC)
    `);

    // 4. Monthly Summary Stats - For long-term trends
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_monthly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        month TEXT NOT NULL, -- YYYY-MM
        totalWorkouts INTEGER DEFAULT 0,
        totalSets INTEGER DEFAULT 0,
        totalCalories INTEGER DEFAULT 0,
        musclesWorked TEXT, -- JSON array
        avgWorkoutsPerWeek REAL,
        topExercises TEXT, -- JSON array of top 5 exercises
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, month)
      )
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_month 
      ON liftr_monthly_stats(userId, month DESC)
    `);

    return NextResponse.json({
      success: true,
      message: 'Metadata tables created successfully',
      tables: [
        'liftr_workout_meta - Last 10 sessions per workout',
        'liftr_personal_records - All-time PRs',
        'liftr_weekly_stats - Weekly summaries',
        'liftr_monthly_stats - Monthly summaries',
      ],
      benefits: [
        '✅ Keep last 30 days of detailed session data',
        '✅ Store only workout metadata (10x smaller)',
        '✅ Fast queries (no scanning old data)',
        '✅ PRs and trends preserved forever',
        '✅ Delete old sessions without losing progress tracking',
      ],
    });
  } catch (error) {
    console.error('Meta tables initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meta tables' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}

