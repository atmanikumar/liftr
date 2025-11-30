import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// GET all training programs
export async function GET() {
  try {
    const programs = await query('SELECT * FROM liftr_training_programs ORDER BY createdAt DESC');

    // Parse workoutIds JSON for each program
    const parsedPrograms = programs.map(program => ({
      ...program,
      workoutIds: JSON.parse(program.workoutIds || '[]'),
    }));

    return NextResponse.json({
      success: true,
      programs: parsedPrograms,
    });
  } catch (error) {
    console.error('Fetch training programs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training programs' },
      { status: 500 }
    );
  }
}

// POST create new training program
export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { name, workoutIds, description } = await request.json();

    // Validate input
    if (!name || !workoutIds || workoutIds.length === 0) {
      return NextResponse.json(
        { error: 'Program name and at least one workout are required' },
        { status: 400 }
      );
    }

    // Create training program
    const result = await execute(
      `INSERT INTO liftr_training_programs (name, workoutIds, description, createdBy) 
       VALUES (?, ?, ?, ?)`,
      [
        name,
        JSON.stringify(workoutIds),
        description || null,
        authResult.user.id,
      ]
    );

    // Fetch created program
    const newProgram = await query(
      'SELECT * FROM liftr_training_programs WHERE id = ?',
      [result.lastInsertRowid]
    );

    if (!newProgram || newProgram.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch created program' },
        { status: 500 }
      );
    }

    const parsedProgram = {
      ...newProgram[0],
      workoutIds: JSON.parse(newProgram[0].workoutIds),
    };

    return NextResponse.json({
      success: true,
      program: parsedProgram,
    });
  } catch (error) {
    console.error('Create training program error:', error);
    return NextResponse.json(
      { error: 'Failed to create training program' },
      { status: 500 }
    );
  }
}

