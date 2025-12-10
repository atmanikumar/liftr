import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

// GET - Get last completed session for a specific workout/exercise
export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const workoutId = parseInt(params.workoutId);
    
    // Get the equipment type filter from query params
    const { searchParams } = new URL(request.url);
    const equipmentType = searchParams.get('equipmentType'); // 'dumbbell' or 'other'

    // EQUIPMENT-SPECIFIC PRE-POPULATION LOGIC
    // ========================================
    // This ensures weight pre-fill is equipment-appropriate:
    // - Dumbbell workouts (H tag) → Only pre-fill from previous dumbbell sessions
    // - Non-dumbbell workouts → Only pre-fill from previous non-dumbbell sessions
    // 
    // Why? Because weights differ significantly between equipment types:
    // - Dumbbell Chest Press: 40 lbs dumbbells (20 lbs each hand)
    // - Barbell Bench Press: 135 lbs barbell (different mechanics)
    // 
    // Without this filter, switching between equipment types would show
    // incorrect/misleading weight suggestions.
    
    const currentWorkout = await query(
      'SELECT equipmentName FROM liftr_workouts WHERE id = ?',
      [workoutId]
    );
    
    if (currentWorkout.length === 0) {
      return NextResponse.json({ lastSession: null });
    }
    
    const currentEquipment = currentWorkout[0].equipmentName?.toLowerCase() || '';
    const isDumbbell = currentEquipment.includes('dumbbell');
    
    // Get last session for this specific exercise, filtered by equipment type
    const sessions = await query(
      `SELECT ws.*, w.name as workoutName, w.equipmentName
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       WHERE ws.userId = ? 
       AND ws.workoutId = ?
       AND ${isDumbbell 
         ? "LOWER(w.equipmentName) LIKE '%dumbbell%'" 
         : "LOWER(w.equipmentName) NOT LIKE '%dumbbell%'"}
       ORDER BY ws.completedAt DESC
       LIMIT 10`,
      [userId, workoutId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ lastSession: null });
    }

    // Group sets from the most recent session
    // All sets with the same timestamp should be grouped together
    const lastCompletedAt = sessions[0].completedAt;
    const lastSessionSets = sessions.filter(s => s.completedAt === lastCompletedAt);

    // Only return first 2 sets to prevent extra sets from persisting
    const setsData = lastSessionSets
      .map(set => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
      }))
      .sort((a, b) => a.setNumber - b.setNumber)
      .slice(0, 2); // Only keep first 2 sets

    const exerciseData = {
      workoutName: sessions[0].workoutName,
      equipmentName: sessions[0].equipmentName,
      unit: sessions[0].unit || 'lbs',
      sets: setsData,
    };

    return NextResponse.json({ lastSession: exerciseData });
  } catch (error) {
    console.error('Error fetching last exercise session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

