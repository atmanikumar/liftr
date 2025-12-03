import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Get active workout for current user
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticatedUserId = authResult.user.id;
    const userRole = authResult.user.role;
    
    // Check if viewing as another user (for trainers/admins)
    const { searchParams } = new URL(request.url);
    const viewAsUserId = searchParams.get('viewAs');
    
    let userId = authenticatedUserId;
    
    // If viewAs is specified, verify the trainer has permission
    if (viewAsUserId) {
      if (userRole !== 'trainer' && userRole !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Verify the trainee belongs to this trainer (skip for admin)
      if (userRole === 'trainer') {
        const traineeCheck = await query(
          'SELECT id FROM liftr_users WHERE id = ? AND trainerId = ?',
          [parseInt(viewAsUserId), authenticatedUserId]
        );
        
        if (traineeCheck.length === 0) {
          return NextResponse.json({ error: 'Not authorized to view this user' }, { status: 403 });
        }
      }
      
      userId = parseInt(viewAsUserId);
    }

    const activeWorkouts = await query(
      'SELECT * FROM liftr_active_workouts WHERE userId = ? ORDER BY startedAt DESC LIMIT 1',
      [userId]
    );

    if (activeWorkouts.length === 0) {
      return NextResponse.json({ activeWorkout: null });
    }

    const activeWorkout = activeWorkouts[0];
    return NextResponse.json({
      activeWorkout: {
        ...activeWorkout,
        workoutData: JSON.parse(activeWorkout.workoutData),
      },
    });
  } catch (error) {
    console.error('Error fetching active workout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Start a new active workout
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { trainingProgramId, workoutData } = await request.json();

    if (!trainingProgramId || !workoutData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has an active workout for this program
    const existingActive = await query(
      'SELECT COUNT(*) as count FROM liftr_active_workouts WHERE userId = ? AND trainingProgramId = ?',
      [userId, trainingProgramId]
    );

    // Delete only the active workout for THIS specific program (if exists)
    if (existingActive[0].count > 0) {
      await execute(
        'DELETE FROM liftr_active_workouts WHERE userId = ? AND trainingProgramId = ?',
        [userId, trainingProgramId]
      );
    }

    // Create new active workout
    await execute(
      'INSERT INTO liftr_active_workouts (userId, trainingProgramId, workoutData) VALUES (?, ?, ?)',
      [userId, trainingProgramId, JSON.stringify(workoutData)]
    );

    // Get the newly created active workout ID
    const newActiveWorkout = await query(
      'SELECT id FROM liftr_active_workouts WHERE userId = ? ORDER BY startedAt DESC LIMIT 1',
      [userId]
    );

    return NextResponse.json({ 
      success: true, 
      activeWorkoutId: newActiveWorkout[0]?.id 
    });
  } catch (error) {
    console.error('Error creating active workout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update active workout
export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { workoutData } = await request.json();

    if (!workoutData) {
      return NextResponse.json(
        { error: 'Missing workout data' },
        { status: 400 }
      );
    }

    await execute(
      'UPDATE liftr_active_workouts SET workoutData = ? WHERE userId = ?',
      [JSON.stringify(workoutData), userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating active workout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove active workout (on completion)
export async function DELETE(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    await execute('DELETE FROM liftr_active_workouts WHERE userId = ?', [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting active workout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

