import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Get active workout by ID
export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticatedUserId = authResult.user.id;
    const userRole = authResult.user.role;
    const { id } = params;
    
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
      `SELECT aw.*, tp.name as programName, tp.workoutIds
       FROM liftr_active_workouts aw
       JOIN liftr_training_programs tp ON aw.trainingProgramId = tp.id
       WHERE aw.id = ? AND aw.userId = ?`,
      [id, userId]
    );

    if (activeWorkouts.length === 0) {
      return NextResponse.json({ error: 'Active workout not found' }, { status: 404 });
    }

    const activeWorkout = activeWorkouts[0];
    return NextResponse.json({
      activeWorkout: {
        id: activeWorkout.id,
        trainingProgramId: activeWorkout.trainingProgramId,
        programName: activeWorkout.programName,
        workoutIds: JSON.parse(activeWorkout.workoutIds),
        workoutData: JSON.parse(activeWorkout.workoutData),
        startedAt: activeWorkout.startedAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

