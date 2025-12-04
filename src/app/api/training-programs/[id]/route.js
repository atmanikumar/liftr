import { NextResponse } from 'next/server';
import { execute, queryOne, query } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// PUT update training program
export async function PUT(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  // Only admin can edit workout plans
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can edit workout plans' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;
    const { name, workoutIds, description } = await request.json();

    // Check if program exists
    const program = await queryOne('SELECT * FROM liftr_training_programs WHERE id = ?', [id]);

    if (!program) {
      return NextResponse.json(
        { error: 'Training program not found' },
        { status: 404 }
      );
    }

    // Update program
    await execute(
      `UPDATE liftr_training_programs 
       SET name = ?, workoutIds = ?, description = ?
       WHERE id = ?`,
      [name, JSON.stringify(workoutIds), description, id]
    );

    // Fetch updated program
    const updatedProgram = await queryOne('SELECT * FROM liftr_training_programs WHERE id = ?', [id]);

    const parsedProgram = {
      ...updatedProgram,
      workoutIds: JSON.parse(updatedProgram.workoutIds),
    };

    return NextResponse.json({
      success: true,
      program: parsedProgram,
    });
  } catch (error) {
    console.error('Update training program error:', error);
    return NextResponse.json(
      { error: 'Failed to update training program' },
      { status: 500 }
    );
  }
}

// DELETE training program
export async function DELETE(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  // Only admin can delete workout plans
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can delete workout plans' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;

    // Check if program exists
    const program = await queryOne('SELECT * FROM liftr_training_programs WHERE id = ?', [id]);

    if (!program) {
      return NextResponse.json(
        { error: 'Training program not found' },
        { status: 404 }
      );
    }

    // Check if program has been used in any sessions
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM liftr_workout_sessions WHERE trainingProgramId = ?',
      [id]
    );

    if (usageCheck[0].count > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete workout plan. It has been used in ${usageCheck[0].count} workout session(s). Deleting it would break your workout history.`,
          usageCount: usageCheck[0].count
        },
        { status: 400 }
      );
    }

    // Check if program is currently active
    const activeCheck = await query(
      'SELECT COUNT(*) as count FROM liftr_active_workouts WHERE trainingProgramId = ?',
      [id]
    );

    if (activeCheck[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete workout plan. There is an active workout using this plan. Complete or cancel it first.' },
        { status: 400 }
      );
    }

    // Safe to delete - no historical data will be lost
    await execute('DELETE FROM liftr_training_programs WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Training program deleted successfully',
    });
  } catch (error) {
    console.error('Delete training program error:', error);
    return NextResponse.json(
      { error: 'Failed to delete training program' },
      { status: 500 }
    );
  }
}

