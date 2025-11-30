import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessions } = await request.json();
    
    if (!sessions || !Array.isArray(sessions)) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    const userId = authResult.user.id;
    let totalSetsInserted = 0;
    const completedAt = new Date().toISOString();

    // Insert each set as a separate row
    for (const session of sessions) {
      const { workoutId, trainingProgramId, sets, unit } = session;
      
      // Insert each set as a separate row
      for (const set of sets) {
        // Calculate weight change (current weight - previous weight)
        const weightChange = set.previousWeight !== undefined 
          ? set.weight - set.previousWeight 
          : 0;
        
        await execute(
          `INSERT INTO liftr_workout_sessions 
           (userId, workoutId, trainingProgramId, setNumber, reps, weight, weightChange, rir, unit, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            workoutId,
            trainingProgramId,
            set.setNumber,
            set.reps,
            set.weight,
            weightChange,
            set.rir,
            unit,
            completedAt,
          ]
        );
        totalSetsInserted++;
      }
    }

    // Delete active workout after successful save
    await execute('DELETE FROM liftr_active_workouts WHERE userId = ?', [userId]);

    return NextResponse.json({
      success: true,
      message: `Saved ${totalSetsInserted} sets across ${sessions.length} workouts`,
    });
  } catch (error) {
    console.error('Save workout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save workout session' },
      { status: 500 }
    );
  }
}

