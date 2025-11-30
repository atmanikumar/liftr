import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';
import { calculateCalories } from '@/lib/caloriesCalculator';

export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { sessionId } = params; // completedAt timestamp

    // Get all sets from this session
    const sessions = await query(
      `SELECT weight, reps, rir, unit
       FROM liftr_workout_sessions
       WHERE userId = ? AND completedAt = ?`,
      [userId, sessionId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ calories: 0 });
    }

    // Calculate total calories
    let totalCalories = 0;
    sessions.forEach(session => {
      const calories = calculateCalories(
        session.weight,
        session.reps,
        session.rir,
        session.unit
      );
      totalCalories += calories;
    });

    return NextResponse.json({ calories: Math.round(totalCalories) });
  } catch (error) {
    console.error('Error calculating session calories:', error);
    return NextResponse.json({ calories: 0 });
  }
}

