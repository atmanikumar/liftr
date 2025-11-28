import { NextResponse } from 'next/server';
import { execute, queryOne } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// PUT update workout
export async function PUT(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = params;
    const { name, equipmentName, equipmentPhoto, muscleFocus, description } = await request.json();

    // Check if workout exists
    const workout = await queryOne('SELECT * FROM liftr_workouts WHERE id = ?', [id]);

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Update workout
    await execute(
      `UPDATE liftr_workouts 
       SET name = ?, equipmentName = ?, equipmentPhoto = ?, muscleFocus = ?, description = ?
       WHERE id = ?`,
      [name, equipmentName, equipmentPhoto, muscleFocus, description, id]
    );

    // Fetch updated workout
    const updatedWorkout = await queryOne('SELECT * FROM liftr_workouts WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      workout: updatedWorkout,
    });
  } catch (error) {
    console.error('Update workout error:', error);
    return NextResponse.json(
      { error: 'Failed to update workout' },
      { status: 500 }
    );
  }
}

// DELETE workout
export async function DELETE(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = params;

    // Check if workout exists
    const workout = await queryOne('SELECT * FROM liftr_workouts WHERE id = ?', [id]);

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Delete workout
    await execute('DELETE FROM liftr_workouts WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Workout deleted successfully',
    });
  } catch (error) {
    console.error('Delete workout error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout' },
      { status: 500 }
    );
  }
}

