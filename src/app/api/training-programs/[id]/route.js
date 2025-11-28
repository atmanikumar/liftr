import { NextResponse } from 'next/server';
import { execute, queryOne } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// PUT update training program
export async function PUT(request, { params }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

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

    // Delete program
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

