/* Energy calculation engine: Mifflin-St Jeor BMR, step burn, and MET-based workout burn */

export function calculateBMR(weightKg, heightCm, age, gender) {
  var w = Number(weightKg) || 70;
  var h = Number(heightCm) || 175;
  var a = Number(age) || 25;
  var isFemale = String(gender || '').toLowerCase() === 'female';
  var base = (10 * w) + (6.25 * h) - (5 * a);
  return Math.round(isFemale ? (base - 161) : (base + 5));
}

export function calculateStepBurn(steps, weightKg) {
  var s = Number(steps) || 0;
  var w = Number(weightKg) || 70;
  return Math.round(s * 0.04 * (w / 70));
}

export function calculateWorkoutBurn(weightKg, durationMinutes, met) {
  var w = Number(weightKg) || 70;
  var d = Number(durationMinutes) || 0;
  var m = (met != null && !isNaN(Number(met))) ? Number(met) : 5;
  return Math.round(m * w * (d / 60));
}

export function calculateTEF(kcalConsumed) {
  var k = Number(kcalConsumed) || 0;
  return Math.round(k * 0.10);
}

export function calculateTotalBurn(weight, height, age, gender, steps, workoutMinutes, kcalConsumed) {
  var bmr = calculateBMR(weight, height, age, gender);
  var stepBurn = calculateStepBurn(steps, weight);
  var workoutBurn = calculateWorkoutBurn(weight, workoutMinutes);
  var tef = calculateTEF(kcalConsumed);
  var totalBurn = bmr + stepBurn + workoutBurn + tef;
  return {
    bmr: bmr,
    stepBurn: stepBurn,
    workoutBurn: workoutBurn,
    tef: tef,
    totalBurn: totalBurn
  };
}
