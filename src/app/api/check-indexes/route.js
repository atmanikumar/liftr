import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';

/**
 * Check Database Indexes
 * Verify that all required indexes are created
 */
export async function GET() {
  try {
    // Get all indexes from SQLite
    const indexes = await query(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `);

    // Expected indexes
    const expectedIndexes = [
      'idx_workout_sessions_user_date',
      'idx_workout_sessions_program_date',
      'idx_workout_sessions_workout',
      'idx_workout_sessions_user_workout',
      'idx_active_workouts_user',
      'idx_achievements_user_date',
      'idx_achievements_user_workout',
      'idx_achievements_user_type',
      'idx_workout_meta_user_workout',
      'idx_workout_meta_user_date',
      'idx_personal_records_user_workout',
      'idx_personal_records_user_date',
      'idx_weekly_stats_user_week',
      'idx_monthly_stats_user_month',
      'idx_users_trainer',
      'idx_workouts_id',
    ];

    const foundIndexes = indexes.map(idx => idx.name);
    const missingIndexes = expectedIndexes.filter(name => !foundIndexes.includes(name));
    const extraIndexes = foundIndexes.filter(name => !expectedIndexes.includes(name));

    const allIndexesPresent = missingIndexes.length === 0;

    return NextResponse.json({
      success: true,
      allIndexesPresent,
      totalIndexes: foundIndexes.length,
      expectedIndexes: expectedIndexes.length,
      indexes: indexes.map(idx => ({
        name: idx.name,
        table: idx.tbl_name,
        sql: idx.sql,
      })),
      missingIndexes,
      extraIndexes,
      recommendations: allIndexesPresent ? [
        '✅ All indexes are created!',
        '💡 Run ANALYZE in Turso console to optimize query planner',
      ] : [
        '⚠️  Some indexes are missing!',
        '🔧 Run POST /api/optimize-db to create them',
        `Missing: ${missingIndexes.join(', ')}`,
      ],
    });
  } catch (error) {
    console.error('Check indexes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check indexes' },
      { status: 500 }
    );
  }
}

