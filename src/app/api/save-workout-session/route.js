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

    // Insert each set as a separate row
    for (const session of sessions) {
      const { workoutId, trainingProgramId, sets, completedAt } = session;
      
      // Extract unit from weight strings (e.g., "50lbs" -> "lbs")
      const unit = session.weight[0]?.match(/(lbs|kg)/)?.[0] || 'lbs';
      
      // Insert each set as a separate row
      for (let i = 0; i < sets.length; i++) {
        // Extract numeric weight value
        const weightStr = session.weight[i] || '0';
        const weight = parseFloat(weightStr.replace(/[^\d.]/g, '')) || 0;
        
        await execute(
          `INSERT INTO liftr_workout_sessions 
           (userId, workoutId, trainingProgramId, setNumber, reps, weight, rir, unit, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            workoutId,
            trainingProgramId,
            i + 1, // Set number (1-indexed)
            session.reps[i] || 0,
            weight,
            session.rir[i] || 0,
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

