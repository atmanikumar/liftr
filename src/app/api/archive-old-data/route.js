import { NextResponse } from 'next/server';
import { execute, query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

/**
 * Archive Old Data - Move old workout sessions to archive table
 * This keeps the main table small and fast
 * 
 * Strategy:
 * - Keep last 90 days in main table (hot data)
 * - Move older data to archive table (cold data)
 * - Run this monthly via cron job
 */

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Verify admin access
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const retentionDays = parseInt(searchParams.get('retentionDays') || '90');

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    // 1. Create archive table if it doesn't exist
    await execute(`
      CREATE TABLE IF NOT EXISTS liftr_workout_sessions_archive (
        id INTEGER PRIMARY KEY,
        userId INTEGER NOT NULL,
        workoutId INTEGER NOT NULL,
        trainingProgramId INTEGER,
        setNumber INTEGER,
        reps INTEGER,
        weight REAL,
        weightChange REAL,
        rir INTEGER,
        unit TEXT DEFAULT 'lbs',
        completedAt TEXT NOT NULL,
        archivedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create indexes on archive table
    await execute(`
      CREATE INDEX IF NOT EXISTS idx_archive_user_date 
      ON liftr_workout_sessions_archive(userId, completedAt DESC)
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_archive_workout 
      ON liftr_workout_sessions_archive(workoutId, completedAt DESC)
    `);

    // 3. Count sessions to be archived
    const countResult = await query(
      `SELECT COUNT(*) as count 
       FROM liftr_workout_sessions 
       WHERE completedAt < ?`,
      [cutoffISO]
    );
    
    const sessionsToArchive = countResult[0]?.count || 0;

    if (sessionsToArchive === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sessions to archive',
        sessionsToArchive: 0,
        cutoffDate: cutoffISO,
        dryRun,
      });
    }

    if (dryRun) {
      // Get sample of data that would be archived
      const sampleSessions = await query(
        `SELECT userId, workoutId, completedAt 
         FROM liftr_workout_sessions 
         WHERE completedAt < ?
         ORDER BY completedAt ASC
         LIMIT 10`,
        [cutoffISO]
      );

      return NextResponse.json({
        success: true,
        message: 'DRY RUN - No data was archived',
        sessionsToArchive,
        cutoffDate: cutoffISO,
        retentionDays,
        sampleData: sampleSessions,
        dryRun: true,
      });
    }

    // 4. Copy old sessions to archive (batch processing)
    const batchSize = 1000;
    let totalArchived = 0;
    let hasMore = true;

    while (hasMore) {
      // Get batch of old sessions
      const oldSessions = await query(
        `SELECT id, userId, workoutId, trainingProgramId, setNumber, reps, weight, 
                weightChange, rir, unit, completedAt
         FROM liftr_workout_sessions
         WHERE completedAt < ?
         ORDER BY completedAt ASC
         LIMIT ?`,
        [cutoffISO, batchSize]
      );

      if (oldSessions.length === 0) {
        hasMore = false;
        break;
      }

      // Insert into archive
      for (const session of oldSessions) {
        await execute(
          `INSERT INTO liftr_workout_sessions_archive 
           (id, userId, workoutId, trainingProgramId, setNumber, reps, weight, 
            weightChange, rir, unit, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.id,
            session.userId,
            session.workoutId,
            session.trainingProgramId,
            session.setNumber,
            session.reps,
            session.weight,
            session.weightChange,
            session.rir,
            session.unit,
            session.completedAt,
          ]
        );
      }

      // Delete from main table
      const ids = oldSessions.map(s => s.id);
      if (ids.length > 0) {
        await execute(
          `DELETE FROM liftr_workout_sessions 
           WHERE id IN (${ids.map(() => '?').join(',')})`,
          ids
        );
      }

      totalArchived += oldSessions.length;

      // Safety check - if we're archiving too much in one go, stop
      if (totalArchived >= 10000) {
        break; // Process in chunks, run again later
      }
    }

    // 5. Vacuum to reclaim space (optional, can be slow)
    // await execute('VACUUM');

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Archived ${totalArchived} sessions successfully`,
      sessionsArchived: totalArchived,
      cutoffDate: cutoffISO,
      retentionDays,
      executionTime: `${executionTime}ms`,
      recommendations: [
        '✅ Set up a monthly Vercel Cron Job to run this automatically',
        '✅ Run VACUUM in Turso console to reclaim disk space',
        '✅ Monitor main table size to ensure it stays fast',
      ],
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Archive Data] Error after ${executionTime}ms:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to archive data' },
      { status: 500 }
    );
  }
}

// GET endpoint for dry run
export async function GET(request) {
  const url = new URL(request.url);
  url.searchParams.set('dryRun', 'true');
  return POST(new Request(url.toString(), { method: 'POST' }));
}

