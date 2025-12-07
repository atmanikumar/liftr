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

    // 2. Get all today's sessions with equipment details for calories calculation
    const todaySessions = await query(
      `SELECT ws.*, w.equipmentName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND DATE(ws.completedAt) = DATE(?)
       ORDER BY ws.completedAt DESC`,
      [userId, today]
    );

    // Helper function to calculate calories for a set
    const calculateSetCalories = (equipmentName) => {
      const userWeight = 70; // kg, could be stored in user profile later
      let met = 5.0; // default moderate intensity
      const equipment = equipmentName?.toLowerCase() || '';
      
      if (equipment.includes('squat') || equipment.includes('deadlift')) {
        met = 6.0; // high intensity compound
      } else if (equipment.includes('curl') || equipment.includes('extension')) {
        met = 4.0; // isolation exercise
      } else if (equipment.includes('press')) {
        met = 5.5; // moderate-high intensity
      }
      
      // Calories = MET × weight(kg) × duration(hours)
      // Assume ~2 minutes per set
      const durationHours = 2 / 60;
      return met * userWeight * durationHours;
    };

    // 3. Group sessions by trainingProgramId and completedAt, and calculate calories + muscle distribution
    const sessionGroups = {};
    let totalCalories = 0;

    todaySessions.forEach(session => {
      const key = `${session.trainingProgramId}_${session.completedAt}`;
      
      if (!sessionGroups[key]) {
        sessionGroups[key] = {
          trainingProgramId: session.trainingProgramId,
          completedAt: session.completedAt,
          setCount: 0,
          calories: 0,
          muscleDistribution: {},
        };
      }
      
      sessionGroups[key].setCount++;
      const setCalories = calculateSetCalories(session.equipmentName);
      sessionGroups[key].calories += setCalories;
      totalCalories += setCalories;
      
      // Track muscle distribution for this session
      if (session.muscleFocus) {
        if (!sessionGroups[key].muscleDistribution[session.muscleFocus]) {
          sessionGroups[key].muscleDistribution[session.muscleFocus] = 0;
        }
        sessionGroups[key].muscleDistribution[session.muscleFocus]++;
      }
    });

    // Convert to array and sort
    const completedSessions = Object.values(sessionGroups)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .map(session => ({
        ...session,
        calories: Math.round(session.calories),
        muscleDistribution: Object.entries(session.muscleDistribution).map(([muscle, count]) => ({
          muscle,
          count
        })),
      }));

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
      completedSessions,
      workoutPlans: plans,
      todayCalories: Math.round(totalCalories),
      sessionCount: todaySessions.length,
      // Progress data now loaded lazily via separate endpoints
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

