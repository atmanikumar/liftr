import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Fetch all data needed for home page in one call
export async function GET(request) {
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

    // 1. Get all active workouts (in-progress)
    const activeWorkoutsData = await query(
      `SELECT aw.*, tp.name as programName, tp.workoutIds
       FROM liftr_active_workouts aw
       JOIN liftr_training_programs tp ON aw.trainingProgramId = tp.id
       WHERE aw.userId = ?
       ORDER BY aw.startedAt DESC`,
      [userId]
    );
    
    const activeWorkouts = await Promise.all(activeWorkoutsData.map(async (aw) => {
      const workoutIds = JSON.parse(aw.workoutIds || '[]');
      
      // Check if all workouts use only dumbbells
      let isDumbbellOnly = false;
      if (workoutIds.length > 0) {
        const workouts = await query(
          `SELECT equipmentName FROM liftr_workouts WHERE id IN (${workoutIds.map(() => '?').join(',')})`,
          workoutIds
        );
        
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
    }));

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

    // Get all workouts to calculate muscle distribution for each plan
    const allWorkouts = await query(`SELECT id, name, muscleFocus FROM liftr_workouts`);
    
    // Create a Map for O(1) lookups instead of O(n) find operations
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));
    
    // Parse workoutIds for each plan and calculate muscle distribution
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

    // 5. Get ALL sessions for progress calculations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allRecentSessions = await query(
      `SELECT ws.*, w.equipmentName, w.muscleFocus
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.completedAt >= ?
       ORDER BY ws.completedAt DESC`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    // Calculate calories per day for last 30 days
    const caloriesByDay = {};
    
    allRecentSessions.forEach(session => {
      const date = new Date(session.completedAt).toISOString().split('T')[0];
      
      // Calories by day
      if (!caloriesByDay[date]) {
        caloriesByDay[date] = 0;
      }
      const setCalories = calculateSetCalories(session.equipmentName);
      caloriesByDay[date] += setCalories;
    });

    // 6. Get muscle distribution from last 7 days ONLY (muscles recover after 1 week)
    // Count by SETS, not by workout sessions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysSessions = await query(
      `SELECT ws.*, w.muscleFocus
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.completedAt >= ?`,
      [userId, sevenDaysAgo.toISOString()]
    );

    // Count muscle sets (each set = 1 count for proper intensity distribution)
    const workoutsByMuscle = {};
    for (const session of last7DaysSessions) {
      if (session.muscleFocus) {
        if (!workoutsByMuscle[session.muscleFocus]) {
          workoutsByMuscle[session.muscleFocus] = 0;
        }
        // Count this as 1 set (each session row is one set)
        workoutsByMuscle[session.muscleFocus]++;
      }
    }

    // Prepare chart data for last 30 days
    const last30Days = [];
    const todayDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.push({
        date: dateStr,
        shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
        calories: Math.round(caloriesByDay[dateStr] || 0),
      });
    }

    // Recent completed workout plans (last 5 unique training programs with session details)
    const completedProgramSessions = new Map(); // Track by trainingProgramId + completedAt combination
    
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
        programSession.workouts.add(session.equipmentName);
        programSession.totalSets++;
        programSession.calories += calculateSetCalories(session.equipmentName);
      }
    }
    
    // Convert to array and get workout names for each plan
    // Create a Map of plans for O(1) lookups
    const planMap = new Map(plans.map(p => [p.id, p]));
    
    const recentCompletedPlans = [];
    const sortedSessions = Array.from(completedProgramSessions.values())
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5);
    
    for (const sessionData of sortedSessions) {
      const plan = planMap.get(sessionData.trainingProgramId);
      if (plan) {
        // Get actual workouts performed in this specific session
        const sessionWorkouts = allRecentSessions.filter(
          s => s.trainingProgramId === sessionData.trainingProgramId && 
               s.completedAt === sessionData.completedAt
        );
        
        // Get unique workout IDs and use workoutMap for details (no additional query needed!)
        const performedWorkoutIds = [...new Set(sessionWorkouts.map(s => s.workoutId))];
        const workoutDetails = performedWorkoutIds
          .map(id => workoutMap.get(id))
          .filter(Boolean);
        
        if (workoutDetails.length > 0) {
          // Calculate muscle distribution from actual performed workouts
          // Use workoutMap for O(1) lookups instead of find()
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
    
    const recentActivity = recentCompletedPlans;

    return NextResponse.json({
      activeWorkouts, // Array of all in-progress workouts
      completedSessions,
      workoutPlans: plans,
      todayCalories: Math.round(totalCalories),
      sessionCount: todaySessions.length,
      progress: {
        caloriesChart: last30Days,
        muscleDistribution: Object.entries(workoutsByMuscle).map(([muscle, count]) => ({
          muscle,
          count,
        })),
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching home data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

