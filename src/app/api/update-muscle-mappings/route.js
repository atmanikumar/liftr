import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { detectMuscleFromExercise } from '@/constants/app';
import { requireAuth } from '@/lib/authMiddleware';

// Helper to update muscle mappings
async function updateMappings(forceUpdate = false) {
  // Get all workouts
  const workouts = await query('SELECT id, name, muscleFocus FROM liftr_workouts');
  
  const updates = [];
  const noChange = [];
  const errors = [];

  for (const workout of workouts) {
    try {
      // Detect muscle from exercise name
      const detectedMuscle = detectMuscleFromExercise(workout.name);
      
      // Force update all workouts if forceUpdate is true
      // Otherwise, only update if:
      // 1. Current muscleFocus is null/empty, OR
      // 2. Current muscleFocus is "Full Body" (incorrect fallback), OR
      // 3. Current muscleFocus doesn't match what we detect
      const shouldUpdate = forceUpdate ||
        !workout.muscleFocus || 
        workout.muscleFocus === '' || 
        workout.muscleFocus === 'Full Body' ||
        workout.muscleFocus === 'Back'; // Update generic 'Back' to 'Upper Back' or 'Lower Back'
      
      if (shouldUpdate && detectedMuscle !== workout.muscleFocus) {
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

  return {
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
  };
}

// GET - Preview muscle mappings (for testing)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') !== 'false';
    const forceUpdate = searchParams.get('forceUpdate') === 'true';
    
    if (dryRun) {
      // Just preview what would be updated without making changes
      const workouts = await query('SELECT id, name, muscleFocus FROM liftr_workouts');
      
      const preview = workouts.map(workout => ({
        id: workout.id,
        name: workout.name,
        currentMuscle: workout.muscleFocus || 'None',
        detectedMuscle: detectMuscleFromExercise(workout.name),
        wouldUpdate: forceUpdate || 
          !workout.muscleFocus || 
          workout.muscleFocus === '' || 
          workout.muscleFocus === 'Full Body' ||
          workout.muscleFocus === 'Back',
      }));
      
      return NextResponse.json({
        dryRun: true,
        totalWorkouts: workouts.length,
        wouldUpdate: preview.filter(p => p.wouldUpdate && p.currentMuscle !== p.detectedMuscle).length,
        preview: preview.filter(p => p.wouldUpdate && p.currentMuscle !== p.detectedMuscle),
      });
    }
    
    // Actually run the update
    const result = await updateMappings(forceUpdate);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Update muscle mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to update muscle mappings' },
      { status: 500 }
    );
  }
}

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
    // Check if force update is requested
    let forceUpdate = false;
    try {
      const body = await request.json();
      forceUpdate = body.forceUpdate === true;
    } catch (e) {
      // No body provided, use default behavior
    }

    const result = await updateMappings(forceUpdate);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Update muscle mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to update muscle mappings' },
      { status: 500 }
    );
  }
}

