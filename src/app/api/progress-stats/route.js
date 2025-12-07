import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Fetch progress statistics (muscle distribution & calories chart)
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

    // Get sessions for last 30 days (limit 500)
    // Select only needed columns for performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allRecentSessions = await query(
      `SELECT ws.completedAt, w.equipmentName, w.muscleFocus
       FROM liftr_workout_sessions ws
       INNER JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.completedAt >= ?
       ORDER BY ws.completedAt DESC
       LIMIT 500`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    // Calculate calories per day and muscle distribution in one pass
    const caloriesByDay = {};
    const workoutsByMuscle = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    
    allRecentSessions.forEach(session => {
      const date = new Date(session.completedAt).toISOString().split('T')[0];
      
      // Calories by day
      if (!caloriesByDay[date]) {
        caloriesByDay[date] = 0;
      }
      const setCalories = calculateSetCalories(session.equipmentName);
      caloriesByDay[date] += setCalories;
      
      // Muscle distribution (last 7 days only)
      if (session.completedAt >= sevenDaysAgoISO && session.muscleFocus) {
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

    const executionTime = Date.now() - startTime;
    console.log(`[Progress Stats API] Execution time: ${executionTime}ms`);

    return NextResponse.json({
      caloriesChart: last30Days,
      muscleDistribution: Object.entries(workoutsByMuscle).map(([muscle, count]) => ({
        muscle,
        count,
      })),
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Progress Stats API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message || 'Failed to fetch progress stats' }, { status: 500 });
  }
}


