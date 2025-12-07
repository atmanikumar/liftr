import { NextResponse } from 'next/server';
import { execute, query } from '@/services/database/dbService';

export async function GET() {
  try {
    // Check if trainerId column already exists
    const tableInfo = await query(`PRAGMA table_info(liftr_users)`);
    const hasTrainerId = tableInfo.some(col => col.name === 'trainerId');

    if (hasTrainerId) {
      return NextResponse.json({
        success: true,
        message: 'trainerId column already exists',
        alreadyExists: true,
      });
    }

    // Add trainerId column to liftr_users table
    await execute(`
      ALTER TABLE liftr_users 
      ADD COLUMN trainerId INTEGER DEFAULT NULL
    `);

    return NextResponse.json({
      success: true,
      message: 'trainerId column added successfully to liftr_users table',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add trainerId column' },
      { status: 500 }
    );
  }
}




