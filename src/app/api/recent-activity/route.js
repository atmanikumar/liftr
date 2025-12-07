import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// Increase max duration for this endpoint
export const maxDuration = 20;

// GET - Fetch recent workout activity
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

    // Get recent sessions (last 30 days, limit 500)
    // Select only needed columns for performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allRecentSessions = await query(
      `SELECT ws.trainingProgramId, ws.completedAt, ws.workoutId, ws.weight, ws.unit,
              w.equipmentName, w.muscleFocus, w.name as workoutName
       FROM liftr_workout_sessions ws
       INNER JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.completedAt >= ?
       ORDER BY ws.completedAt DESC
       LIMIT 500`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    // Get all training programs
    const workoutPlans = await query(
      `SELECT id, name, workoutIds 
       FROM liftr_training_programs 
       ORDER BY createdAt DESC`
    );
    
    // Create a Map for O(1) lookups
    const planMap = new Map(workoutPlans.map(p => [p.id, p]));

    // Get all workouts for muscle focus mapping
    const allWorkouts = await query(`SELECT id, name, muscleFocus FROM liftr_workouts`);
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

    // Group sessions by trainingProgramId and completedAt
    const completedProgramSessions = new Map();
    
    for (const session of allRecentSessions) {
      if (session.trainingProgramId && session.completedAt) {
        const sessionKey = `${session.trainingProgramId}_${session.completedAt}`;
        
        if (!completedProgramSessions.has(sessionKey)) {
          completedProgramSessions.set(sessionKey, {
            trainingProgramId: session.trainingProgramId,
            completedAt: session.completedAt,
            workouts: new Set(),
            totalSets: 0,
            calories: 0,
          });
        }
        
        const programSession = completedProgramSessions.get(sessionKey);
        programSession.workouts.add(session.workoutName);
        programSession.totalSets++;
        programSession.calories += calculateSetCalories(session.equipmentName);
      }
    }
    
    // Convert to array and get details for each session
    const recentCompletedPlans = [];
    const sortedSessions = Array.from(completedProgramSessions.values())
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5); // Only get top 5
    
    for (const sessionData of sortedSessions) {
      const plan = planMap.get(sessionData.trainingProgramId);
      if (plan) {
        // Get actual workouts performed in this specific session
        const sessionWorkouts = allRecentSessions.filter(
          s => s.trainingProgramId === sessionData.trainingProgramId && 
               s.completedAt === sessionData.completedAt
        );
        
        // Get unique workout IDs
        const performedWorkoutIds = [...new Set(sessionWorkouts.map(s => s.workoutId))];
        const workoutDetails = performedWorkoutIds
          .map(id => workoutMap.get(id))
          .filter(Boolean);
        
        if (workoutDetails.length > 0) {
          // Calculate muscle distribution
          const muscleFocusCount = {};
          sessionWorkouts.forEach(s => {
            const workout = workoutMap.get(s.workoutId);
            if (workout && workout.muscleFocus) {
              muscleFocusCount[workout.muscleFocus] = (muscleFocusCount[workout.muscleFocus] || 0) + 1;
            }
          });
          
          // Calculate improvements/decreases compared to previous session
          const improvements = [];
          const decreases = [];
          
          // Get previous session for this training program
          const previousSessionWorkouts = allRecentSessions.filter(
            s => s.trainingProgramId === sessionData.trainingProgramId && 
                 s.completedAt < sessionData.completedAt
          );
          
          if (previousSessionWorkouts.length > 0) {
            // Get unique previous session dates and use the most recent one
            const prevSessionDates = [...new Set(previousSessionWorkouts.map(s => s.completedAt))];
            const mostRecentPrevDate = prevSessionDates.sort((a, b) => new Date(b) - new Date(a))[0];
            
            // Group previous session workouts by workoutId
            const prevWorkoutMaxWeight = {};
            previousSessionWorkouts
              .filter(s => s.completedAt === mostRecentPrevDate)
              .forEach(s => {
                if (!prevWorkoutMaxWeight[s.workoutId] || s.weight > prevWorkoutMaxWeight[s.workoutId]) {
                  prevWorkoutMaxWeight[s.workoutId] = s.weight;
                }
              });
            
            // Group current session workouts by workoutId
            const currWorkoutMaxWeight = {};
            sessionWorkouts.forEach(s => {
              if (!currWorkoutMaxWeight[s.workoutId] || s.weight > currWorkoutMaxWeight[s.workoutId]) {
                currWorkoutMaxWeight[s.workoutId] = s.weight;
              }
            });
            
            // Compare
            for (const [workoutId, currentMax] of Object.entries(currWorkoutMaxWeight)) {
              const prevMax = prevWorkoutMaxWeight[workoutId];
              if (prevMax && prevMax !== currentMax) {
                const workout = workoutMap.get(parseInt(workoutId));
                if (workout) {
                  if (currentMax > prevMax) {
                    improvements.push({
                      exercise: workout.name,
                      increase: currentMax - prevMax,
                      unit: sessionWorkouts.find(s => s.workoutId === parseInt(workoutId))?.unit || 'lbs',
                    });
                  } else {
                    decreases.push({
                      exercise: workout.name,
                      decrease: prevMax - currentMax,
                      unit: sessionWorkouts.find(s => s.workoutId === parseInt(workoutId))?.unit || 'lbs',
                    });
                  }
                }
              }
            }
          }
          
          recentCompletedPlans.push({
            id: plan.id,
            name: plan.name,
            completedAt: sessionData.completedAt,
            workoutCount: performedWorkoutIds.length,
            workoutNames: workoutDetails.map(w => w.name),
            muscleFocusGroups: Object.entries(muscleFocusCount).map(([muscle, count]) => ({ muscle, count })),
            totalSets: sessionData.totalSets,
            calories: Math.round(sessionData.calories),
            comparison: {
              hasComparison: improvements.length > 0 || decreases.length > 0,
              improvements,
              decreases,
            },
          });
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Recent Activity API] Execution time: ${executionTime}ms`);

    return NextResponse.json({
      recentActivity: recentCompletedPlans,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Recent Activity API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message || 'Failed to fetch recent activity' }, { status: 500 });
  }
}


