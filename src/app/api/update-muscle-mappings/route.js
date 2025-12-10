import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { detectMuscleFromExercise } from '@/constants/app';
import { requireAuth } from '@/lib/authMiddleware';

// POST - Update all workouts with proper muscle mappings based on exercise names
export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  // Only admin can run this update
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can update muscle mappings' },
      { status: 403 }
    );
  }

  try {
    // Get all workouts
    const workouts = await query('SELECT id, name, muscleFocus FROM liftr_workouts');
    
    const updates = [];
    const noChange = [];
    const errors = [];

    for (const workout of workouts) {
      try {
        // Detect muscle from exercise name
        const detectedMuscle = detectMuscleFromExercise(workout.name);
        
        // Only update if:
        // 1. Current muscleFocus is null/empty, OR
        // 2. Current muscleFocus is generic "Legs" and we detected something more specific
        const shouldUpdate = 
          !workout.muscleFocus || 
          workout.muscleFocus === '' || 
          (workout.muscleFocus === 'Legs' && detectedMuscle !== 'Legs' && detectedMuscle !== 'Full Body');
        
        if (shouldUpdate) {
          await execute(
            'UPDATE liftr_workouts SET muscleFocus = ? WHERE id = ?',
            [detectedMuscle, workout.id]
          );
          
          updates.push({
            id: workout.id,
            name: workout.name,
            oldMuscle: workout.muscleFocus || 'None',
            newMuscle: detectedMuscle,
          });
        } else {
          noChange.push({
            id: workout.id,
            name: workout.name,
            currentMuscle: workout.muscleFocus,
            detectedMuscle: detectedMuscle,
          });
        }
      } catch (error) {
        errors.push({
          id: workout.id,
          name: workout.name,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} workouts`,
      summary: {
        totalWorkouts: workouts.length,
        updated: updates.length,
        noChange: noChange.length,
        errors: errors.length,
      },
      details: {
        updates,
        noChange: noChange.slice(0, 10), // Limit to first 10
        errors,
      },
    });
  } catch (error) {
    console.error('Update muscle mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to update muscle mappings' },
      { status: 500 }
    );
  }
}

