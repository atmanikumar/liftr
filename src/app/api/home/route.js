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

    const userId = authResult.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Get all active workouts (in-progress)
    const activeWorkoutsData = await query(
      `SELECT aw.*, tp.name as programName
       FROM liftr_active_workouts aw
       JOIN liftr_training_programs tp ON aw.trainingProgramId = tp.id
       WHERE aw.userId = ?
       ORDER BY aw.startedAt DESC`,
      [userId]
    );
    
    const activeWorkouts = activeWorkoutsData.map(aw => ({
      id: aw.id, // Use active workout session ID
      trainingProgramId: aw.trainingProgramId,
      name: aw.programName,
      startedAt: aw.startedAt,
      workoutData: JSON.parse(aw.workoutData),
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
    
    // Parse workoutIds for each plan and calculate muscle distribution
    const plans = workoutPlans.map(plan => {
      const workoutIds = JSON.parse(plan.workoutIds || '[]');
      
      // Calculate muscle distribution for this plan based on its workouts
      const muscleCount = {};
      workoutIds.forEach(workoutId => {
        const workout = allWorkouts.find(w => w.id === workoutId);
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
    const workoutsByMuscle = {};
    
    allRecentSessions.forEach(session => {
      const date = new Date(session.completedAt).toISOString().split('T')[0];
      
      // Calories by day
      if (!caloriesByDay[date]) {
        caloriesByDay[date] = 0;
      }
      const setCalories = calculateSetCalories(session.equipmentName);
      caloriesByDay[date] += setCalories;
      
      // Muscle group distribution
      if (session.muscleFocus) {
        if (!workoutsByMuscle[session.muscleFocus]) {
          workoutsByMuscle[session.muscleFocus] = 0;
        }
        workoutsByMuscle[session.muscleFocus]++;
      }
    });

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
    const recentCompletedPlans = [];
    const sortedSessions = Array.from(completedProgramSessions.values())
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5);
    
    for (const sessionData of sortedSessions) {
      const plan = plans.find(p => p.id === sessionData.trainingProgramId);
      if (plan) {
        // Get actual workouts performed in this specific session
        const sessionWorkouts = allRecentSessions.filter(
          s => s.trainingProgramId === sessionData.trainingProgramId && 
               s.completedAt === sessionData.completedAt
        );
        
        // Get unique workout IDs from this session
        const performedWorkoutIds = [...new Set(sessionWorkouts.map(s => s.workoutId))];
        
        if (performedWorkoutIds.length > 0) {
          // Get workout details only for workouts actually performed
          const workoutDetails = await query(
            `SELECT id, name, muscleFocus FROM liftr_workouts WHERE id IN (${performedWorkoutIds.join(',')})` 
          );
          
          // Calculate muscle distribution from actual performed workouts
          const muscleFocusCount = {};
          sessionWorkouts.forEach(s => {
            const workout = workoutDetails.find(w => w.id === s.workoutId);
            if (workout && workout.muscleFocus) {
              muscleFocusCount[workout.muscleFocus] = (muscleFocusCount[workout.muscleFocus] || 0) + 1;
            }
          });
          
          recentCompletedPlans.push({
            id: plan.id,
            name: plan.name,
            completedAt: sessionData.completedAt,
            workoutCount: performedWorkoutIds.length,
            workoutNames: workoutDetails.map(w => w.name),
            muscleFocusGroups: Object.entries(muscleFocusCount).map(([muscle, count]) => ({ muscle, count })),
            totalSets: sessionData.totalSets,
            calories: Math.round(sessionData.calories),
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

