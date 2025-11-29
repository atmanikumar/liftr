import { NextResponse } from 'next/server';
import { execute } from '@/services/database/dbService';

const WORKOUTS = [
  // Leg Exercises
  { name: 'Leg Extension', equipmentName: 'Leg Extension Machine', muscleFocus: 'Quadriceps', description: 'Isolation exercise for quads' },
  { name: 'Leg Curl', equipmentName: 'Leg Curl Machine', muscleFocus: 'Hamstrings', description: 'Isolation exercise for hamstrings' },
  { name: 'Hack Squat', equipmentName: 'Hack Squat Machine', muscleFocus: 'Quadriceps', description: 'Compound leg exercise targeting quads' },
  { name: 'Leg Press', equipmentName: 'Leg Press Machine', muscleFocus: 'Legs', description: 'Compound leg exercise for overall leg development' },
  { name: 'Bulgarian Split Squats', equipmentName: 'Dumbbells/Bodyweight', muscleFocus: 'Legs', description: 'Unilateral leg exercise' },
  { name: 'Calf Raise', equipmentName: 'Calf Raise Machine', muscleFocus: 'Calves', description: 'Isolation exercise for calves' },
  { name: 'Deadlift', equipmentName: 'Barbell', muscleFocus: 'Back', description: 'Compound exercise for posterior chain' },
  { name: 'Hip Thruster', equipmentName: 'Barbell/Machine', muscleFocus: 'Glutes', description: 'Glute-focused hip extension exercise' },
  
  // Upper Body - Shoulders & Arms
  { name: 'Shoulder Press', equipmentName: 'Dumbbells/Barbell', muscleFocus: 'Shoulders', description: 'Overhead pressing movement for delts' },
  { name: 'Cable Lateral Raise (One Arm)', equipmentName: 'Cable Machine', muscleFocus: 'Shoulders', description: 'Isolation for side delts' },
  { name: 'Machine Reverse Flys', equipmentName: 'Pec Deck/Reverse Fly Machine', muscleFocus: 'Shoulders', description: 'Rear delt isolation' },
  { name: 'Cable Triceps Pushdown', equipmentName: 'Cable Machine', muscleFocus: 'Triceps', description: 'Triceps isolation exercise' },
  { name: 'Smith Machine Overhead Press', equipmentName: 'Smith Machine', muscleFocus: 'Shoulders', description: 'Guided overhead press' },
  { name: 'Cable Shoulder Lateral Raise', equipmentName: 'Cable Machine', muscleFocus: 'Shoulders', description: 'Side delt cable work' },
  { name: 'Bayesian Biceps Curls', equipmentName: 'Cable Machine', muscleFocus: 'Biceps', description: 'Cable curl variation for peak contraction' },
  { name: 'Preacher Curls', equipmentName: 'Preacher Bench', muscleFocus: 'Biceps', description: 'Isolated biceps exercise' },
  { name: 'Rope Pushdown', equipmentName: 'Cable Machine', muscleFocus: 'Triceps', description: 'Triceps cable exercise' },
  { name: 'Dips', equipmentName: 'Dip Station', muscleFocus: 'Chest', description: 'Bodyweight compound exercise' },
  
  // Upper Body - Chest & Back
  { name: 'Smith Machine Incline Press', equipmentName: 'Smith Machine', muscleFocus: 'Chest', description: 'Upper chest pressing movement' },
  { name: 'Lat Pulldown', equipmentName: 'Lat Pulldown Machine', muscleFocus: 'Back', description: 'Vertical pulling exercise for lats' },
  { name: 'Pec Flys', equipmentName: 'Pec Deck Machine', muscleFocus: 'Chest', description: 'Chest isolation exercise' },
  { name: 'Seated Row (Horizontal Grip)', equipmentName: 'Cable Row Machine', muscleFocus: 'Back', description: 'Horizontal pulling for mid-back' },
];

const PROGRAMS = [
  {
    name: 'Leg Day - Quad Focused',
    description: 'Quadriceps-focused leg workout',
    workouts: ['Leg Extension', 'Leg Curl', 'Hack Squat', 'Leg Press', 'Bulgarian Split Squats', 'Calf Raise']
  },
  {
    name: 'Delts & Arms',
    description: 'Shoulder and arm isolation workout',
    workouts: ['Shoulder Press', 'Cable Lateral Raise (One Arm)', 'Machine Reverse Flys', 'Cable Triceps Pushdown']
  },
  {
    name: 'Leg Day - Ham & Glute Focused',
    description: 'Hamstring and glute-focused leg workout',
    workouts: ['Leg Extension', 'Leg Curl', 'Deadlift', 'Hip Thruster', 'Bulgarian Split Squats']
  },
  {
    name: 'Upper Body Circuit',
    description: 'Full upper body compound workout',
    workouts: [
      'Smith Machine Incline Press',
      'Lat Pulldown',
      'Pec Flys',
      'Seated Row (Horizontal Grip)',
      'Smith Machine Overhead Press',
      'Cable Shoulder Lateral Raise',
      'Bayesian Biceps Curls',
      'Preacher Curls',
      'Rope Pushdown',
      'Dips'
    ]
  },
];

export async function POST() {
  try {
    // Get current user (assuming admin for seeding)
    const userId = 1; // Admin user

    // Insert workouts and collect IDs
    const workoutIdMap = {};
    
    for (const workout of WORKOUTS) {
      const result = await execute(
        `INSERT INTO liftr_workouts (name, equipmentName, equipmentPhoto, muscleFocus, description, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workout.name,
          workout.equipmentName,
          '', // Empty photo for now
          workout.muscleFocus,
          workout.description,
          userId,
          new Date().toISOString(),
        ]
      );
      workoutIdMap[workout.name] = Number(result.lastInsertRowid);
    }

    // Insert programs
    for (const program of PROGRAMS) {
      const workoutIds = program.workouts.map(name => workoutIdMap[name]).filter(Boolean);
      
      await execute(
        `INSERT INTO liftr_training_programs (name, description, workoutIds, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          program.name,
          program.description,
          JSON.stringify(workoutIds),
          userId,
          new Date().toISOString(),
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${WORKOUTS.length} workouts and ${PROGRAMS.length} programs`,
      workouts: WORKOUTS.length,
      programs: PROGRAMS.length,
    });
  } catch (error) {
    console.error('Seed data error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed data' },
      { status: 500 }
    );
  }
}

