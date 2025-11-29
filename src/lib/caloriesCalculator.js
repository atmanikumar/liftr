/**
 * Calculate calories burned for a workout
 * Based on MET (Metabolic Equivalent of Task) values
 * 
 * Formula: Calories = (MET × weight in kg × duration in hours)
 * 
 * For resistance training:
 * - Light intensity: 3.5 METs
 * - Moderate intensity: 5 METs
 * - Vigorous intensity: 6 METs
 * 
 * We estimate intensity based on weight lifted and RIR
 */

// Estimate MET based on weight lifted and RIR
const getMET = (weight, reps, rir) => {
  // RIR 0-1 = vigorous (6 METs)
  // RIR 2-4 = moderate (5 METs)
  // RIR 5+ = light (3.5 METs)
  
  if (rir <= 1) return 6;
  if (rir <= 4) return 5;
  return 3.5;
};

// Estimate duration based on sets and reps
// Average 3 seconds per rep + 90 seconds rest between sets
const estimateDuration = (totalSets) => {
  const avgRepsPerSet = 10;
  const secondsPerRep = 3;
  const restBetweenSets = 90; // seconds
  
  const workTime = totalSets * avgRepsPerSet * secondsPerRep;
  const restTime = (totalSets - 1) * restBetweenSets;
  
  return (workTime + restTime) / 3600; // Convert to hours
};

/**
 * Calculate calories burned for a single set
 * @param {number} weight - Weight lifted in lbs
 * @param {number} reps - Number of reps
 * @param {number} rir - Reps in reserve (0-6)
 * @param {number} userWeightKg - User's body weight in kg (default: 75kg / 165lbs)
 * @returns {number} - Estimated calories burned
 */
export const calculateSetCalories = (weight, reps, rir, userWeightKg = 75) => {
  const met = getMET(weight, reps, rir);
  const durationHours = estimateDuration(1); // Duration for 1 set
  
  return met * userWeightKg * durationHours;
};

/**
 * Calculate calories burned for an entire workout
 * @param {Array} sets - Array of sets with {weight, reps, rir}
 * @param {number} userWeightKg - User's body weight in kg
 * @returns {number} - Estimated calories burned
 */
export const calculateWorkoutCalories = (sets, userWeightKg = 75) => {
  let totalCalories = 0;
  
  sets.forEach(set => {
    totalCalories += calculateSetCalories(set.weight, set.reps, set.rir, userWeightKg);
  });
  
  return Math.round(totalCalories);
};

/**
 * Calculate calories burned for an entire training program
 * @param {Object} workoutData - Workout data object with workouts and sets
 * @param {number} userWeightKg - User's body weight in kg
 * @returns {number} - Estimated calories burned
 */
export const calculateProgramCalories = (workoutData, userWeightKg = 75) => {
  let totalCalories = 0;
  
  Object.values(workoutData).forEach(workout => {
    if (workout.sets) {
      totalCalories += calculateWorkoutCalories(workout.sets.filter(s => s.completed), userWeightKg);
    }
  });
  
  return totalCalories;
};

/**
 * Get calories burned for today's workouts from sessions
 * @param {Array} sessions - Array of workout sessions from DB
 * @param {number} userWeightKg - User's body weight in kg
 * @returns {number} - Estimated calories burned today
 */
export const getTodayCalories = (sessions, userWeightKg = 75) => {
  const today = new Date().toDateString();
  
  const todaySessions = sessions.filter(session => {
    const sessionDate = new Date(session.completedAt).toDateString();
    return sessionDate === today;
  });
  
  return calculateWorkoutCalories(todaySessions, userWeightKg);
};

