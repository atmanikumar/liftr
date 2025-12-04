import { NextResponse } from 'next/server';
import { execute, queryOne, query } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// PUT update workout
export async function PUT(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  // Only admin can edit workouts
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can edit workouts' },
      { status: 403 }
    );
  }

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

  // Only admin can delete workouts
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can delete workouts' },
      { status: 403 }
    );
  }

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

    // Check if workout has been used in any sessions
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM liftr_workout_sessions WHERE workoutId = ?',
      [id]
    );

    if (usageCheck[0].count > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete workout. It has been used in ${usageCheck[0].count} workout session(s). Deleting it would break your workout history.`,
          usageCount: usageCheck[0].count
        },
        { status: 400 }
      );
    }

    // Safe to delete - no historical data will be lost
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

