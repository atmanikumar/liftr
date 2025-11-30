import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString();

    // Get achievements from today
    const achievements = await query(
      `SELECT * FROM liftr_achievements 
       WHERE userId = ? 
       AND achievedAt >= ? 
       AND achievedAt < ?
       ORDER BY achievedAt DESC`,
      [userId, todayStart, tomorrowStart]
    );

    return NextResponse.json({
      achievements,
    });
  } catch (error) {
    console.error('Error fetching today achievements:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

