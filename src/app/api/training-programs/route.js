import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { requireAuth } from '@/lib/authMiddleware';

// GET all training programs with optional pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 1000; // Default to large number for backward compatibility
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM liftr_training_programs');
    const total = countResult[0].total;

    // Get paginated programs
    const programs = await query(
      'SELECT * FROM liftr_training_programs ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Parse workoutIds JSON and check for dumbbell-only programs
    const parsedPrograms = await Promise.all(programs.map(async (program) => {
      const workoutIds = JSON.parse(program.workoutIds || '[]');
      
      // Check if all workouts in the program use only dumbbells
      let isDumbbellOnly = false;
      if (workoutIds.length > 0) {
        const workouts = await query(
          `SELECT equipmentName FROM liftr_workouts WHERE id IN (${workoutIds.map(() => '?').join(',')})`,
          workoutIds
        );
        
        // Check if all workouts have "dumbbell" in equipment name
        isDumbbellOnly = workouts.length > 0 && workouts.every(w => 
          w.equipmentName?.toLowerCase().includes('dumbbell')
        );
      }
      
      return {
        ...program,
        workoutIds,
        equipmentTag: isDumbbellOnly ? 'Dumbbells (H)' : null,
      };
    }));

    return NextResponse.json({
      success: true,
      programs: parsedPrograms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + programs.length < total,
      },
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

    // Check if all workouts use only dumbbells
    const workouts = await query(
      `SELECT equipmentName FROM liftr_workouts WHERE id IN (${workoutIds.map(() => '?').join(',')})`,
      workoutIds
    );
    
    const isDumbbellOnly = workouts.length > 0 && workouts.every(w => 
      w.equipmentName?.toLowerCase().includes('dumbbell')
    );

    const parsedProgram = {
      ...newProgram[0],
      workoutIds: JSON.parse(newProgram[0].workoutIds),
      equipmentTag: isDumbbellOnly ? 'Dumbbells (H)' : null,
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

