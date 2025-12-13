import { NextResponse } from 'next/server';
import { execute, query } from '@/services/database/dbService';
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
    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const completedAt = istTime.toISOString();
    const improvements = [];
    const decreases = [];

    // Validate sessions
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'No sessions to save' }, { status: 400 });
    }

    // Pre-fetch workout IDs
    const workoutIds = sessions
      .map(s => parseInt(s.workoutId))
      .filter(id => !isNaN(id) && id > 0);
    
    if (workoutIds.length === 0) {
      return NextResponse.json({ error: 'Invalid workout IDs' }, { status: 400 });
    }
    
    // Pre-fetch LAST SESSION data for each workout (not all-time max)
    // This will be used to compare for achievements
    const lastSessionData = {};
    
    for (const workoutId of workoutIds) {
      const lastSession = await query(
        `SELECT weight, reps, rir, unit, completedAt
         FROM liftr_workout_sessions
         WHERE userId = ? AND workoutId = ? AND completedAt < ?
         ORDER BY completedAt DESC, weight DESC
         LIMIT 10`,
        [userId, workoutId, completedAt]
      );
      
      if (lastSession.length > 0) {
        // Get max weight, max reps, and min RIR from last session's timestamp
        const lastTimestamp = lastSession[0].completedAt;
        const lastSessionSets = lastSession.filter(s => s.completedAt === lastTimestamp);
        
        lastSessionData[workoutId] = {
          maxWeight: Math.max(...lastSessionSets.map(s => parseFloat(s.weight) || 0)),
          maxReps: Math.max(...lastSessionSets.map(s => parseInt(s.reps) || 0)),
          minRir: Math.min(...lastSessionSets.map(s => parseInt(s.rir) || 10)),
          unit: lastSessionSets[0].unit
        };
      }
    }

    // Pre-fetch all workout names (avoid N+1)
    const workoutNames = {};
    const allWorkouts = await query(
      `SELECT id, name FROM liftr_workouts WHERE id IN (${workoutIds.map(() => '?').join(',')})`,
      workoutIds
    );
    allWorkouts.forEach(w => {
      workoutNames[w.id] = w.name;
    });

    // Insert each set as a separate row
    for (const session of sessions) {
      const { workoutId, trainingProgramId, sets, unit } = session;
      
      // Validate sets array
      if (!sets || sets.length === 0) {
        continue; // Skip if no sets
      }
      
      // Get last session data for comparison (only compare to last session, not all-time)
      const lastData = lastSessionData[workoutId] || { maxWeight: 0, maxReps: 0, minRir: 10 };
      const currentMaxWeight = Math.max(...sets.map(s => s.weight || 0));
      const currentMaxReps = Math.max(...sets.map(s => s.reps || 0));
      const currentMinRir = Math.min(...sets.map(s => s.rir || 10));
      
      // Insert each set as a separate row
      for (const set of sets) {
        // Validate and sanitize set data
        const weight = parseFloat(set.weight) || 0;
        const previousWeight = parseFloat(set.previousWeight) || 0;
        const reps = parseInt(set.reps) || 0;
        const rir = parseInt(set.rir) || 0;
        const setNumber = parseInt(set.setNumber) || 0;
        
        // Skip invalid sets
        if (weight < 0 || reps < 0 || rir < 0 || setNumber < 0) {
          continue;
        }
        
        // Calculate weight change (current weight - previous weight)
        const weightChange = previousWeight > 0 ? weight - previousWeight : 0;
        
        await execute(
          `INSERT INTO liftr_workout_sessions 
           (userId, workoutId, trainingProgramId, setNumber, reps, weight, weightChange, rir, unit, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            parseInt(workoutId),
            parseInt(trainingProgramId),
            setNumber,
            reps,
            weight,
            weightChange,
            rir,
            unit || 'lbs',
            completedAt,
          ]
        );
        totalSetsInserted++;
      }
      
      // Track achievements for this workout
      const exerciseName = workoutNames[workoutId] || 'Unknown';
      
      // Only track achievements if we have previous data to compare against
      if (lastData.maxWeight > 0) {
        // Check if current session beats last session:
        // Achievement requires: max weight >= last max weight AND max reps >= last max reps AND min RIR <= last min RIR
        // (You must at least match the previous performance in all categories to get credit)
        
        const beatsWeight = currentMaxWeight > lastData.maxWeight;
        const beatsReps = currentMaxReps > lastData.maxReps;
        const beatsRir = currentMinRir < lastData.minRir;
        
        // Weight achievement: beat last session's max weight
        if (beatsWeight) {
          const improvement = currentMaxWeight - lastData.maxWeight;
          
          await execute(
            `INSERT INTO liftr_achievements 
             (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, workoutId, exerciseName, 'weight', lastData.maxWeight, currentMaxWeight, improvement, unit, completedAt]
          );
          
          improvements.push({
            exercise: exerciseName,
            type: 'weight',
            previousWeight: lastData.maxWeight,
            newWeight: currentMaxWeight,
            improvement,
            unit,
          });
        } else if (currentMaxWeight < lastData.maxWeight) {
          const decrease = lastData.maxWeight - currentMaxWeight;
          decreases.push({
            exercise: exerciseName,
            previousWeight: lastData.maxWeight,
            newWeight: currentMaxWeight,
            decrease,
            unit,
          });
        }
        
        // Reps achievement: beat last session's max reps (only if weight is same or higher)
        if (beatsReps && currentMaxWeight >= lastData.maxWeight) {
          const repsImprovement = currentMaxReps - lastData.maxReps;
          
          await execute(
            `INSERT INTO liftr_achievements 
             (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, workoutId, exerciseName, 'reps', lastData.maxReps, currentMaxReps, repsImprovement, `${currentMaxWeight} ${unit}`, completedAt]
          );
          
          improvements.push({
            exercise: exerciseName,
            type: 'reps',
            previousReps: lastData.maxReps,
            newReps: currentMaxReps,
            improvement: repsImprovement,
            weight: currentMaxWeight,
            unit,
          });
        }
        
        // RIR achievement: beat last session's min RIR (only if weight and reps are same or higher)
        if (beatsRir && currentMaxWeight >= lastData.maxWeight && currentMaxReps >= lastData.maxReps) {
          const rirImprovement = lastData.minRir - currentMinRir;
          
          await execute(
            `INSERT INTO liftr_achievements 
             (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, workoutId, exerciseName, 'rir', lastData.minRir, currentMinRir, rirImprovement, `${currentMaxWeight} ${unit} × ${currentMaxReps}`, completedAt]
          );
          
          improvements.push({
            exercise: exerciseName,
            type: 'rir',
            previousRir: lastData.minRir,
            newRir: currentMinRir,
            improvement: rirImprovement,
            weight: currentMaxWeight,
            reps: currentMaxReps,
            unit,
          });
        }
      }
    }

    // Update workout metadata for each workout (for lightweight access)
    for (const session of sessions) {
      const { workoutId, sets, unit } = session;
      
      const maxWeight = Math.max(...sets.map(s => s.weight || 0));
      const avgWeight = sets.reduce((sum, s) => sum + (s.weight || 0), 0) / sets.length;
      const avgReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0) / sets.length;
      const avgRir = sets.reduce((sum, s) => sum + (s.rir || 0), 0) / sets.length;
      const sessionDate = completedAt.split('T')[0];
      
      try {
        await execute(
          `INSERT OR REPLACE INTO liftr_workout_meta 
           (userId, workoutId, sessionDate, maxWeight, avgWeight, totalSets, avgReps, avgRir, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, workoutId, sessionDate, maxWeight, avgWeight, sets.length, avgReps, avgRir, unit]
        );
      } catch (e) {
        // Meta table might not exist yet, that's ok
        console.log('Metadata table not initialized yet');
      }
    }

    // Delete active workout after successful save
    await execute('DELETE FROM liftr_active_workouts WHERE userId = ?', [userId]);

    return NextResponse.json({
      success: true,
      message: `Saved ${totalSetsInserted} sets across ${sessions.length} workouts`,
      improvements,
      decreases,
      completedAt,
    });
  } catch (error) {
    console.error('Save workout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save workout session' },
      { status: 500 }
    );
  }
}

