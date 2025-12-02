import { NextResponse } from 'next/server';
import { query } from '@/services/database/dbService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticatedUserId = authResult.user.id;
    const userRole = authResult.user.role;
    
    // Check if viewing as another user (for trainers)
    const { searchParams } = new URL(request.url);
    const viewAsUserId = searchParams.get('viewAs');
    
    let userId = authenticatedUserId;
    
    // If viewAs is specified, verify the trainer has permission
    if (viewAsUserId) {
      if (userRole !== 'trainer' && userRole !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Verify the trainee belongs to this trainer
      if (userRole === 'trainer') {
        const traineeCheck = await query(
          'SELECT id FROM liftr_users WHERE id = ? AND trainerId = ?',
          [parseInt(viewAsUserId), authenticatedUserId]
        );
        
        if (traineeCheck.length === 0) {
          return NextResponse.json({ error: 'Not authorized to view this user' }, { status: 403 });
        }
      }
      
      userId = parseInt(viewAsUserId);
    }
    
    // Get achievements from the last 20 hours
    // This ensures achievements disappear 20 hours after they were earned
    const twentyHoursAgo = new Date();
    twentyHoursAgo.setHours(twentyHoursAgo.getHours() - 20);
    const cutoffTime = twentyHoursAgo.toISOString();

    // Get achievements from the last 20 hours
    const achievements = await query(
      `SELECT * FROM liftr_achievements 
       WHERE userId = ? 
       AND achievedAt >= ?
       ORDER BY achievedAt DESC`,
      [userId, cutoffTime]
    );

    return NextResponse.json({
      achievements,
    });
  } catch (error) {
    console.error('Error fetching today achievements:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

