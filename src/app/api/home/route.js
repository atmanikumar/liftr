import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// Increase max duration for this endpoint (Vercel default is 10s)
export const maxDuration = 10; // Should load very fast now with minimal queries

// GET - Fetch all data needed for home page in one call
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticatedUserId = authResult.user.id;
    const userRole = authResult.user.role;
    
    // Check if viewing as another user (for trainers)
    const { searchParams } = new URL(request.url);
    const viewAsUserId = searchParams.get('viewAs');
    
    let userId = authenticatedUserId;
    
    // If viewAs is specified, verify the trainer has permission
    if (viewAsUserId) {
      if (userRole !== 'trainer' && userRole !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Verify the trainee belongs to this trainer
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
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch all workouts upfront for better performance
    const allWorkouts = await query(`SELECT id, name, muscleFocus, equipmentName FROM liftr_workouts`);
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

    // 1. Get all active workouts (in-progress)
    const activeWorkoutsData = await query(
      `SELECT aw.*, tp.name as programName, tp.workoutIds
       FROM liftr_active_workouts aw
       JOIN liftr_training_programs tp ON aw.trainingProgramId = tp.id
       WHERE aw.userId = ?
       ORDER BY aw.startedAt DESC`,
      [userId]
    );
    
    const activeWorkouts = activeWorkoutsData.map((aw) => {
      const workoutIds = JSON.parse(aw.workoutIds || '[]');
      
      // Check if all workouts use only dumbbells using workoutMap
      let isDumbbellOnly = false;
      if (workoutIds.length > 0) {
        const workouts = workoutIds.map(id => workoutMap.get(id)).filter(Boolean);
        isDumbbellOnly = workouts.length > 0 && workouts.every(w => 
          w.equipmentName?.toLowerCase().includes('dumbbell')
        );
      }
      
      return {
        id: aw.id,
        trainingProgramId: aw.trainingProgramId,
        name: aw.programName,
        startedAt: aw.startedAt,
        workoutData: JSON.parse(aw.workoutData),
        equipmentTag: isDumbbellOnly ? 'Dumbbells (H)' : null,
      };
    });

    // 2. Get simple count of today's sessions (lightweight - no JOIN, no SELECT *)
    const todaySessionCount = await query(
      `SELECT COUNT(*) as count
       FROM liftr_workout_sessions
       WHERE userId = ? 
       AND DATE(completedAt) = DATE(?)`,
      [userId, today]
    );

    const sessionCount = todaySessionCount[0]?.count || 0;

    // 4. Get workout plans with muscle distribution
    const workoutPlans = await query(
      `SELECT id, name, workoutIds, createdAt 
       FROM liftr_training_programs 
       ORDER BY createdAt DESC`
    );

    // Parse workoutIds for each plan and calculate muscle distribution (reusing workoutMap)
    const plans = workoutPlans.map(plan => {
      const workoutIds = JSON.parse(plan.workoutIds || '[]');
      
      // Calculate muscle distribution for this plan based on its workouts
      const muscleCount = {};
      workoutIds.forEach(workoutId => {
        const workout = workoutMap.get(workoutId);
        if (workout && workout.muscleFocus) {
          muscleCount[workout.muscleFocus] = (muscleCount[workout.muscleFocus] || 0) + 1;
        }
      });
      
      const muscleDistribution = Object.entries(muscleCount).map(([muscle, count]) => ({
        muscle,
        count
      }));
      
      return {
        id: plan.id,
        name: plan.name,
        workoutIds,
        createdAt: plan.createdAt,
        muscleDistribution, // Add muscle distribution to each plan
      };
    });

    // Progress stats (muscle distribution & calories chart) now loaded lazily via /api/progress-stats
    // Recent activity now loaded lazily via /api/recent-activity endpoint

    const executionTime = Date.now() - startTime;
    console.log(`[Home API] Execution time: ${executionTime}ms`);

    return NextResponse.json({
      activeWorkouts, // Array of all in-progress workouts
      workoutPlans: plans,
      sessionCount, // Simple count only
      // All heavy data loaded lazily via separate endpoints
      progress: {
        caloriesChart: [], // Loaded lazily via /api/progress-stats
        muscleDistribution: [], // Loaded lazily via /api/progress-stats
        recentActivity: [], // Loaded lazily via /api/recent-activity
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Home API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message || 'Failed to fetch home data' }, { status: 500 });
  }
}

