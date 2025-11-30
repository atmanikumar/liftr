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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchDate = searchParams.get('date') || '';
    const offset = (page - 1) * limit;

    let whereClause = 'ws.userId = ?';
    const params = [userId];

    // Add date filter if provided
    if (searchDate) {
      whereClause += ' AND DATE(ws.completedAt) = DATE(?)';
      params.push(searchDate);
    }

    // Get total count of unique sessions (date + programId combinations)
    const countResult = await query(
      `SELECT COUNT(DISTINCT DATE(ws.completedAt) || '_' || ws.trainingProgramId) as total
       FROM liftr_workout_sessions ws
       WHERE ${whereClause}`,
      params
    );

    const total = countResult[0]?.total || 0;

    // Get all sessions for the date range (we'll group and paginate after)
    // We can't use LIMIT on individual rows because we need to group complete sessions
    const allSessions = await query(
      `SELECT 
        ws.*, 
        w.name as workoutName, 
        w.equipmentName, 
        w.muscleFocus,
        tp.name as programName,
        DATE(ws.completedAt) as sessionDate,
        TIME(ws.completedAt) as sessionTime
       FROM liftr_workout_sessions ws
       JOIN liftr_workouts w ON ws.workoutId = w.id
       LEFT JOIN liftr_training_programs tp ON ws.trainingProgramId = tp.id
       WHERE ${whereClause}
       ORDER BY ws.completedAt DESC`,
      params
    );

    // Group all sessions first
    const allGroupedSessions = {};
    allSessions.forEach(session => {
      const key = `${session.sessionDate}_${session.trainingProgramId}_${session.completedAt}`;
      if (!allGroupedSessions[key]) {
        allGroupedSessions[key] = {
          date: session.sessionDate,
          time: session.sessionTime,
          programId: session.trainingProgramId,
          programName: session.programName,
          completedAt: session.completedAt,
          workouts: {},
        };
      }

      if (!allGroupedSessions[key].workouts[session.workoutId]) {
        allGroupedSessions[key].workouts[session.workoutId] = {
          workoutId: session.workoutId,
          workoutName: session.workoutName,
          equipmentName: session.equipmentName,
          muscleFocus: session.muscleFocus,
          sets: [],
        };
      }

      allGroupedSessions[key].workouts[session.workoutId].sets.push({
        setNumber: session.setNumber,
        weight: session.weight,
        weightChange: session.weightChange || 0,
        reps: session.reps,
        rir: session.rir,
        unit: session.unit,
      });
    });

    // Convert to array, sort by completed date, and paginate
    const allWorkouts = Object.values(allGroupedSessions)
      .map(session => ({
        date: session.date,
        time: session.time,
        programId: session.programId,
        programName: session.programName,
        completedAt: session.completedAt,
        workouts: Object.values(session.workouts),
      }))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Now paginate the grouped sessions
    const paginatedWorkouts = allWorkouts.slice(offset, offset + limit);

    return NextResponse.json({
      workouts: paginatedWorkouts,
      pagination: {
        page,
        limit,
        total: allWorkouts.length,
        totalPages: Math.ceil(allWorkouts.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching recent workouts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

