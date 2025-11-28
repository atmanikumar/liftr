import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// GET all workouts
export async function GET() {
  try {
    const workouts = await query('SELECT * FROM liftr_workouts ORDER BY createdAt DESC');

    return NextResponse.json({
      success: true,
      workouts,
    });
  } catch (error) {
    console.error('Fetch workouts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

// POST create new workout
export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { name, equipmentName, equipmentPhoto, muscleFocus, description } = await request.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Workout name is required' },
        { status: 400 }
      );
    }

    // Create workout
    const result = await execute(
      `INSERT INTO liftr_workouts (name, equipmentName, equipmentPhoto, muscleFocus, description, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        equipmentName || null,
        equipmentPhoto || null,
        muscleFocus || null,
        description || null,
        authResult.user.id,
      ]
    );

    // Fetch created workout
    const newWorkout = await query(
      'SELECT * FROM liftr_workouts WHERE id = ?',
      [result.lastInsertRowid]
    );

    return NextResponse.json({
      success: true,
      workout: newWorkout[0],
    });
  } catch (error) {
    console.error('Create workout error:', error);
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    );
  }
}

