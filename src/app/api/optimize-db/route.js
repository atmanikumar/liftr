import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

/**
 * Create database indexes for optimal query performance
 * Run this endpoint once after database initialization
 */
export async function POST() {
  try {
    // Index for liftr_workout_sessions - most queried table
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed 
      ON liftr_workout_sessions(userId, completedAt DESC)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_program 
      ON liftr_workout_sessions(userId, trainingProgramId)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout 
      ON liftr_workout_sessions(workoutId)
    `);

    // Index for liftr_active_workouts
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_active_workouts_user 
      ON liftr_active_workouts(userId)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_active_workouts_user_started 
      ON liftr_active_workouts(userId, startedAt DESC)
    `);

    // Index for liftr_workouts
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_workouts_created 
      ON liftr_workouts(createdAt DESC)
    `);

    // Index for liftr_training_programs
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_training_programs_created 
      ON liftr_training_programs(createdAt DESC)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_training_programs_created_by 
      ON liftr_training_programs(createdBy)
    `);

    // Index for liftr_users
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_users_username 
      ON liftr_users(username)
    `);

    return NextResponse.json({
      success: true,
      message: 'Database indexes created successfully',
      indexes: [
        'idx_workout_sessions_user_completed',
        'idx_workout_sessions_user_program',
        'idx_workout_sessions_workout',
        'idx_active_workouts_user',
        'idx_active_workouts_user_started',
        'idx_workouts_created',
        'idx_training_programs_created',
        'idx_training_programs_created_by',
        'idx_users_username',
      ]
    });
  } catch (error) {
    console.error('Database optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize database' },
      { status: 500 }
    );
  }
}

