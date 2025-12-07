import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// Increase timeout for complex stats calculations
export const maxDuration = 20;

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = authResult.user.role === 'admin';

    // Get all users if admin, otherwise just current user
    const users = isAdmin 
      ? await query(`SELECT id, username, name, role FROM liftr_users ORDER BY username`)
      : [{ id: authResult.user.id, username: authResult.user.username, name: authResult.user.name, role: authResult.user.role }];

    const userStats = [];

    for (const user of users) {
      // OPTIMIZED: Get only necessary columns and limit to last 500 sessions
      const allSessions = await query(
        `SELECT ws.workoutId, ws.weight, ws.reps, ws.unit, ws.completedAt,
                w.equipmentName, w.name as workoutName
         FROM liftr_workout_sessions ws
         INNER JOIN liftr_workouts w ON ws.workoutId = w.id
         WHERE ws.userId = ?
         ORDER BY ws.completedAt DESC
         LIMIT 500`,
        [user.id]
      );

      if (allSessions.length === 0) {
        userStats.push({
          userId: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          totalWorkoutDays: 0,
          consistency: 0,
          longestBreak: 0,
          currentStreak: 0,
          mostCaloriesBurned: { calories: 0, date: null },
          mostWorkoutsDone: { count: 0, date: null },
          highestWeightLifted: { weight: 0, exercise: null, unit: 'lbs' },
          highestTotalVolume: { volume: 0, date: null },
        });
        continue;
      }

      // Group sessions by date for workout dates
      const sessionsByDate = {};
      allSessions.forEach(session => {
        const date = new Date(session.completedAt).toLocaleDateString();
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = [];
        }
        sessionsByDate[date].push(session);
      });

      const sessions = Object.keys(sessionsByDate).map(date => ({ workoutDate: date }));
      const workoutDates = sessions.map(s => new Date(s.workoutDate));
      const totalWorkoutDays = workoutDates.length;

      // Calculate consistency (last 7 days) - simplified
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7DaysDates = workoutDates.filter(date => date >= sevenDaysAgo);
      const consistencyDays = last7DaysDates.length;

      // Calculate longest break between workouts - simplified
      let longestBreak = 0;
      for (let i = 1; i < workoutDates.length; i++) {
        const daysBetween = Math.floor((workoutDates[i] - workoutDates[i - 1]) / (1000 * 60 * 60 * 24));
        if (daysBetween > longestBreak) {
          longestBreak = daysBetween;
        }
      }

      // Calculate current streak - simplified
      let currentStreak = 0;
      if (workoutDates.length > 0) {
        const sortedDates = [...workoutDates].sort((a, b) => b - a);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const date of sortedDates) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
          if (daysDiff <= currentStreak + 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate calories and stats per day
      const caloriesByDay = {};
      const workoutsByDay = {};
      const totalVolumeByDay = {};
      
      allSessions.forEach(session => {
        const date = new Date(session.completedAt).toLocaleDateString();
        
        // Simplified calories
        const calories = 15; // 15 calories per set
        caloriesByDay[date] = (caloriesByDay[date] || 0) + calories;
        
        // Workouts per day
        if (!workoutsByDay[date]) {
          workoutsByDay[date] = new Set();
        }
        workoutsByDay[date].add(session.workoutName);
        
        // Total volume per day
        const volume = (session.weight || 0) * (session.reps || 0);
        totalVolumeByDay[date] = (totalVolumeByDay[date] || 0) + volume;
      });

      // Find most calories burned per day
      let mostCaloriesBurned = { calories: 0, date: null };
      Object.entries(caloriesByDay).forEach(([date, calories]) => {
        if (calories > mostCaloriesBurned.calories) {
          mostCaloriesBurned = { calories: Math.round(calories), date };
        }
      });

      // Find most workouts done per day
      let mostWorkoutsDone = { count: 0, date: null };
      Object.entries(workoutsByDay).forEach(([date, workouts]) => {
        if (workouts.size > mostWorkoutsDone.count) {
          mostWorkoutsDone = { count: workouts.size, date };
        }
      });

      // Find highest weight lifted
      let highestWeightLifted = { weight: 0, exercise: null, unit: 'lbs' };
      allSessions.forEach(session => {
        if ((session.weight || 0) > highestWeightLifted.weight) {
          highestWeightLifted = {
            weight: session.weight,
            exercise: session.workoutName,
            unit: session.unit || 'lbs',
          };
        }
      });

      // Find highest total volume per day
      let highestTotalVolume = { volume: 0, date: null };
      Object.entries(totalVolumeByDay).forEach(([date, volume]) => {
        if (volume > highestTotalVolume.volume) {
          highestTotalVolume = { volume: Math.round(volume), date };
        }
      });

      userStats.push({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        totalWorkoutDays,
        consistency: consistencyDays,
        longestBreak,
        currentStreak,
        mostCaloriesBurned,
        mostWorkoutsDone,
        highestWeightLifted,
        highestTotalVolume,
      });
    }

    // Sort by consistency (most consistent first)
    userStats.sort((a, b) => b.consistency - a.consistency);

    // Find most consistent person
    const mostConsistent = userStats.length > 0 ? userStats[0] : null;

    const executionTime = Date.now() - startTime;
    console.log(`[Stats API] Execution time: ${executionTime}ms, Users: ${users.length}`);

    return NextResponse.json({
      userStats,
      mostConsistent,
      isAdmin,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[Stats API] Error after ${executionTime}ms:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
