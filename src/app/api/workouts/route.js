import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { requireAuth, verifyAuth } from '@/lib/authMiddleware';

// GET all workouts with optional pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 1000; // Default to large number for backward compatibility
    const offset = (page - 1) * limit;

    // Try to get user ID for personalized sorting (optional, won't fail if not authenticated)
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.authenticated) {
        userId = authResult.user.id;
      }
    } catch (e) {
      // No auth, continue with default sorting
    }

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM liftr_workouts');
    const total = countResult[0].total;

    // Get paginated workouts
    const workouts = await query(
      'SELECT * FROM liftr_workouts ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // If user is authenticated, get usage counts and sort by most used
    if (userId) {
      const usageCounts = await query(
        `SELECT workoutId, COUNT(*) as usageCount
         FROM liftr_workout_sessions
         WHERE userId = ?
         GROUP BY workoutId`,
        [userId]
      );
      
      const usageMap = new Map(usageCounts.map(uc => [uc.workoutId, uc.usageCount]));
      
      // Add usage count to each workout and sort
      workouts.forEach(w => {
        w.usageCount = usageMap.get(w.id) || 0;
      });
      
      // Sort by usage count (most used first), then by createdAt
      workouts.sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return NextResponse.json({
      success: true,
      workouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + workouts.length < total,
      },
    });
  } catch (error) {
    console.error('Fetch workouts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

// POST create new workout
export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  // Only admin and trainer can create workouts
  if (authResult.user.role !== 'admin' && authResult.user.role !== 'trainer') {
    return NextResponse.json(
      { error: 'Only admins and trainers can create workouts' },
      { status: 403 }
    );
  }

  try {
    const { name, equipmentName, equipmentPhoto, muscleFocus, description } = await request.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Workout name is required' },
        { status: 400 }
      );
    }

    // Create workout
    const result = await execute(
      `INSERT INTO liftr_workouts (name, equipmentName, equipmentPhoto, muscleFocus, description, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        equipmentName || null,
        equipmentPhoto || null,
        muscleFocus || null,
        description || null,
        authResult.user.id,
      ]
    );

    // Fetch created workout
    const newWorkout = await query(
      'SELECT * FROM liftr_workouts WHERE id = ?',
      [result.lastInsertRowid]
    );

    if (!newWorkout || newWorkout.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch created workout' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workout: newWorkout[0],
    });
  } catch (error) {
    console.error('Create workout error:', error);
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    );
  }
}

