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

    // Pre-fetch all previous max weights for better performance (avoid N+1)
    const workoutIds = sessions
      .map(s => parseInt(s.workoutId))
      .filter(id => !isNaN(id) && id > 0);
    
    if (workoutIds.length === 0) {
      return NextResponse.json({ error: 'Invalid workout IDs' }, { status: 400 });
    }
    
    const previousMaxWeights = {};
    
    if (workoutIds.length > 0) {
      const previousSessions = await query(
        `SELECT workoutId, MAX(weight) as maxWeight
         FROM liftr_workout_sessions
         WHERE userId = ? AND workoutId IN (${workoutIds.map(() => '?').join(',')}) AND completedAt < ?
         GROUP BY workoutId`,
        [userId, ...workoutIds, completedAt]
      );
      
      previousSessions.forEach(ps => {
        previousMaxWeights[ps.workoutId] = ps.maxWeight;
      });
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
      
      const previousMaxWeight = previousMaxWeights[workoutId] || 0;
      const currentMaxWeight = Math.max(...sets.map(s => s.weight || 0));
      
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
      
      // Get previous session data for this specific workout to compare reps/RIR at same weight
      const previousSession = await query(
        `SELECT weight, reps, rir, unit
         FROM liftr_workout_sessions
         WHERE userId = ? AND workoutId = ? AND completedAt < ?
         ORDER BY completedAt DESC
         LIMIT 1`,
        [userId, workoutId, completedAt]
      );
      
      // Achievement Type 1: Weight increase
      if (currentMaxWeight !== previousMaxWeight && previousMaxWeight > 0 && currentMaxWeight > 0) {
        if (currentMaxWeight > previousMaxWeight) {
          const improvement = currentMaxWeight - previousMaxWeight;
          
          await execute(
            `INSERT INTO liftr_achievements 
             (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, workoutId, exerciseName, 'weight', previousMaxWeight, currentMaxWeight, improvement, unit, completedAt]
          );
          
          improvements.push({
            exercise: exerciseName,
            type: 'weight',
            previousWeight: previousMaxWeight,
            newWeight: currentMaxWeight,
            improvement,
            unit,
          });
        } else {
          const decrease = previousMaxWeight - currentMaxWeight;
          decreases.push({
            exercise: exerciseName,
            previousWeight: previousMaxWeight,
            newWeight: currentMaxWeight,
            decrease,
            unit,
          });
        }
      }
      
      // Achievement Type 2: Reps increase at same weight
      if (previousSession.length > 0) {
        const prevWeight = parseFloat(previousSession[0].weight);
        const prevReps = parseInt(previousSession[0].reps);
        const prevRir = parseInt(previousSession[0].rir);
        
        // Find current session data at same weight
        const currentAtSameWeight = sets.find(s => parseFloat(s.weight) === prevWeight);
        
        if (currentAtSameWeight) {
          const currentReps = parseInt(currentAtSameWeight.reps);
          const currentRir = parseInt(currentAtSameWeight.rir);
          
          // Reps increase at same weight
          if (currentReps > prevReps && currentReps > 0 && prevReps > 0) {
            const repsImprovement = currentReps - prevReps;
            
            await execute(
              `INSERT INTO liftr_achievements 
               (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [userId, workoutId, exerciseName, 'reps', prevReps, currentReps, repsImprovement, `${prevWeight} ${unit}`, completedAt]
            );
            
            improvements.push({
              exercise: exerciseName,
              type: 'reps',
              previousReps: prevReps,
              newReps: currentReps,
              improvement: repsImprovement,
              weight: prevWeight,
              unit,
            });
          }
          
          // RIR decrease at same weight and reps (better performance)
          if (currentRir < prevRir && currentReps === prevReps && currentRir >= 0 && prevRir > 0) {
            const rirImprovement = prevRir - currentRir;
            
            await execute(
              `INSERT INTO liftr_achievements 
               (userId, workoutId, exerciseName, achievementType, previousValue, newValue, improvement, unit, achievedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [userId, workoutId, exerciseName, 'rir', prevRir, currentRir, rirImprovement, `${prevWeight} ${unit} × ${currentReps}`, completedAt]
            );
            
            improvements.push({
              exercise: exerciseName,
              type: 'rir',
              previousRir: prevRir,
              newRir: currentRir,
              improvement: rirImprovement,
              weight: prevWeight,
              reps: currentReps,
              unit,
            });
          }
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

