/* Exercise catalog: comprehensive exercise database, grip variations, and custom exercise persistence */

import { profile } from "../state.js";
import { sv, ls } from "../storage.js";

export var BUILTIN_EXERCISE_CATALOG = [
  // ── Back & Lats ──
  { id: 'lat_pulldown', name: 'Lat Pulldown (Wide Grip)', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'cable', cue: 'Wide overhand grip, drive elbows down to hips' },
  { id: 'close_grip_lat_pulldown', name: 'Close-Grip Lat Pulldown', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'cable', cue: 'V-bar attachment, tuck elbows tight to ribs' },
  { id: 'supinated_lat_pulldown', name: 'Supinated / Reverse-Grip Lat Pulldown', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'cable', cue: 'Underhand grip, massive lower lat recruitment' },
  { id: 'neutral_lat_pulldown', name: 'Neutral-Grip Lat Pulldown', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'cable', cue: 'Palms facing each other, shoulder friendly' },
  { id: 'single_arm_lat_pulldown', name: 'Single-Arm Cable Lat Pulldown', muscle: 'back,biceps', sets: 3, reps: '10–12', rir: '1–2', rest: 60, type: 'cable', cue: 'Unilateral lat focus, slight lateral torso lean' },
  { id: 'straight_arm_pulldown', name: 'Straight-Arm Cable Lat Pushdown', muscle: 'back', sets: 3, reps: '10–15', rir: '1–2', rest: 60, type: 'cable', cue: 'Keep arms locked, sweep bar to thighs' },
  { id: 'machine_row', name: 'Chest-Supported Machine Row', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'machine', cue: 'Drive elbows back, squeeze upper and mid back' },
  { id: 'cable_row', name: 'Seated Cable Row (Close Grip)', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'cable', cue: 'Pull handle to lower belly, control the stretch' },
  { id: 'wide_grip_cable_row', name: 'Wide-Grip Cable Row', muscle: 'back,biceps', sets: 3, reps: '10–12', rir: '1–2', rest: 90, type: 'cable', cue: 'Wide grip to upper abdomen for upper back & rear delts' },
  { id: 'tbar_row', name: 'Chest-Supported T-Bar Row', muscle: 'back,biceps', sets: 3, reps: '8–10', rir: '1–2', rest: 120, type: 'compound', cue: 'Lock feet, pull elbows high' },
  { id: 'barbell_row', name: 'Barbell Bent-Over Row', muscle: 'back,biceps', sets: 3, reps: '8–10', rir: '1–2', rest: 120, type: 'compound', cue: 'Hinge 45°, pull bar to navel' },
  { id: 'pendlay_row', name: 'Pendlay Barbell Row', muscle: 'back,biceps', sets: 3, reps: '6–8', rir: '1–2', rest: 120, type: 'compound', cue: 'Reset from dead-stop on floor each rep' },
  { id: 'db_row', name: 'Single-Arm Dumbbell Row', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Brace on bench, row to hip pocket' },
  { id: 'meadows_row', name: 'Meadows Landmine Row', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Overhand grip at end of landmine bar' },
  { id: 'pull_ups', name: 'Pull-ups (Overhand)', muscle: 'back,biceps', sets: 2, reps: 'failure', rir: '0–1', rest: 120, type: 'compound', bodyweight: true, cue: 'Full deadhang to chin over bar' },
  { id: 'chin_ups', name: 'Chin-ups (Underhand)', muscle: 'back,biceps', sets: 2, reps: 'failure', rir: '0–1', rest: 120, type: 'compound', bodyweight: true, cue: 'Supinated grip, heavy bicep & lat overload' },
  { id: 'assisted_pullup', name: 'Assisted Pull-up Machine', muscle: 'back,biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'machine', cue: 'Counterbalanced weight, strict full range of motion' },

  // ── Chest ──
  { id: 'bench', name: 'Flat Barbell Bench Press', muscle: 'chest,triceps', sets: 3, reps: '6–10', rir: '1–2', rest: 150, type: 'compound', cue: 'Arch upper back, bar down to lower sternum' },
  { id: 'incline_bench', name: 'Incline Barbell Bench Press', muscle: 'chest,triceps', sets: 3, reps: '6–10', rir: '1–2', rest: 150, type: 'compound', cue: '30° incline for clavicular upper chest' },
  { id: 'flat_db_press', name: 'Flat Dumbbell Press', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'compound', cue: 'Deep stretch at bottom, press up smoothly' },
  { id: 'incline_db_press', name: 'Incline Dumbbell Press (30°)', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, cue: 'Slight incline, drive elbows inward at top' },
  { id: 'steep_incline_db_press', name: 'Steep Incline Dumbbell Press (45°)', muscle: 'chest,shoulders', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'compound', cue: 'High upper chest & anterior delt recruitment' },
  { id: 'decline_db_press', name: 'Decline Dumbbell Press', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Lower chest focus, shoulder-friendly path' },
  { id: 'machine_chest_press', name: 'Seated Chest Press Machine', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'machine', cue: 'Adjust seat so handles align with mid-chest' },
  { id: 'incline_smith_press', name: 'Incline Smith Machine Bench Press', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'machine', cue: 'Fixed pressing path for upper chest hypertrophy' },
  { id: 'pec_deck', name: 'Pec Deck / Machine Fly', muscle: 'chest', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'machine', cue: 'Soft bend in elbows, deep stretch and hard contraction' },
  { id: 'high_to_low_cable_fly', name: 'High-to-Low Cable Fly', muscle: 'chest', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'cable', cue: 'Pulleys high, sweep hands down and across for lower pecs' },
  { id: 'low_to_high_cable_fly', name: 'Low-to-High Cable Fly', muscle: 'chest', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'cable', cue: 'Pulleys low, scoop upwards toward chin for upper pecs' },
  { id: 'flat_cable_fly', name: 'Seated / Standing Cable Fly', muscle: 'chest', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'cable', cue: 'Constant horizontal tension throughout entire range' },
  { id: 'dips', name: 'Chest Dips (Bodyweight or Weighted)', muscle: 'chest,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'compound', bodyweight: true, cue: 'Lean torso forward 30°, flare elbows slightly' },
  { id: 'pushups', name: 'Push-ups (Deficit or Weighted)', muscle: 'chest,triceps', sets: 3, reps: '12–20', rir: '0–1', rest: 60, type: 'compound', bodyweight: true, cue: 'Deep chest stretch, push into full lockout' },

  // ── Shoulders ──
  { id: 'ohp', name: 'Standing Barbell Overhead Press (OHP)', muscle: 'shoulders,triceps', sets: 3, reps: '6–10', rir: '1–2', rest: 150, type: 'compound', cue: 'Squeeze glutes and quads, press bar vertically' },
  { id: 'seated_db_press', name: 'Seated Dumbbell Shoulder Press', muscle: 'shoulders,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'compound', cue: '75° bench angle, press in natural scapular plane' },
  { id: 'shoulder_press_machine', name: 'Seated Machine Shoulder Press', muscle: 'shoulders,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'machine', cue: 'Smooth lockout, keep elbows under wrists' },
  { id: 'smith_ohp', name: 'Seated Smith Machine Overhead Press', muscle: 'shoulders,triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'machine', cue: 'Bar path fixed in front of nose' },
  { id: 'lateral_raise_db', name: 'Dumbbell Lateral Raise', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'isolation', cue: 'Slight forward torso lean, raise in scapular plane' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise (Behind Back)', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Cable set at wrist height, continuous stretch tension' },
  { id: 'egyptian_cable_lateral', name: 'Egyptian Lean-Away Cable Lateral Raise', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Lean away from cable column at 30° angle' },
  { id: 'lateral_raise_machine', name: 'Machine Lateral Raise', muscle: 'shoulders', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'machine', cue: 'Padded arm rests, isolate middle deltoid without traps' },
  { id: 'cable_y_raise', name: 'Cable Y-Raise', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Cross cables, raise arms in a 45° Y-shape' },
  { id: 'face_pull', name: 'Face Pull (Cable Rope)', muscle: 'shoulders,back', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Pull to eye level, externally rotate hands backward' },
  { id: 'rear_delt_fly', name: 'Reverse Pec Deck / Rear Delt Fly', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'machine', cue: 'Chest on pad, drive elbows straight back' },
  { id: 'db_rear_delt', name: 'Seated Bent-Over Dumbbell Rear Delt Fly', muscle: 'shoulders', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'isolation', cue: 'Chest on knees, sweep pinkies outwards' },

  // ── Biceps ──
  { id: 'ez_bar_curl', name: 'EZ-Bar Bicep Curl', muscle: 'biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'isolation', cue: 'Shoulder-width grip on angled bar, elbows pinned' },
  { id: 'barbell_curl', name: 'Straight Barbell Bicep Curl', muscle: 'biceps', sets: 3, reps: '8–10', rir: '1–2', rest: 90, type: 'compound', cue: 'Strict form, avoid lower back swinging' },
  { id: 'incline_db_curl', name: 'Incline Dumbbell Curl (45°)', muscle: 'biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'isolation', cue: 'Deep stretch on the long head of the biceps' },
  { id: 'preacher_curl', name: 'Preacher Curl (EZ-Bar)', muscle: 'biceps', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'isolation', cue: 'Armpits snug over pad, full extension and strict curl' },
  { id: 'machine_preacher_curl', name: 'Machine Preacher Curl', muscle: 'biceps', sets: 3, reps: '10–12', rir: '0–1', rest: 75, type: 'machine', cue: 'Consistent resistance curve across entire rep' },
  { id: 'bayesian_cable_curl', name: 'Bayesian Cable Curl (Behind Back)', muscle: 'biceps', sets: 3, reps: '10–12', rir: '0–1', rest: 60, type: 'cable', cue: 'Step forward from low pulley, curl with arm behind torso' },
  { id: 'cable_curl', name: 'Standing Cable Bicep Curl', muscle: 'biceps', sets: 3, reps: '10–12', rir: '0–1', rest: 60, type: 'cable', cue: 'Constant tension from start to finish' },
  { id: 'hammer_curl', name: 'Dumbbell Hammer Curl', muscle: 'biceps,forearms', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'isolation', cue: 'Neutral palms, targets brachialis and brachioradialis' },
  { id: 'cross_body_hammer', name: 'Cross-Body Hammer Curl', muscle: 'biceps,forearms', sets: 3, reps: '10–12', rir: '1–2', rest: 60, type: 'isolation', cue: 'Curl dumbbell across chest toward opposite shoulder' },
  { id: 'rope_hammer_curl', name: 'Cable Rope Hammer Curl', muscle: 'biceps,forearms', sets: 3, reps: '10–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Flare rope ends apart at top of contraction' },
  { id: 'spider_curl', name: 'Spider Curl (Incline Bench Facedown)', muscle: 'biceps', sets: 3, reps: '10–12', rir: '0–1', rest: 60, type: 'isolation', cue: 'Short head peak contraction, zero shoulder assistance' },

  // ── Triceps ──
  { id: 'triceps_pushdown', name: 'Triceps Pushdown (Straight Bar)', muscle: 'triceps', sets: 3, reps: '10–12', rir: '0–1', rest: 60, type: 'cable', cue: 'Elbows pinned to ribs, snap into full lockout' },
  { id: 'rope_pushdown', name: 'Triceps Pushdown (Rope)', muscle: 'triceps', sets: 3, reps: '10–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Spread rope wide at the bottom of the movement' },
  { id: 'overhead_triceps_ext', name: 'Overhead Cable Triceps Extension', muscle: 'triceps', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'cable', cue: 'Long head stretch behind neck, extend arms forward' },
  { id: 'overhead_db_ext', name: 'Single Dumbbell Overhead Extension', muscle: 'triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'isolation', cue: 'Two-handed cup grip, deep stretch behind head' },
  { id: 'skull_crushers', name: 'Skull Crushers (Lying EZ-Bar Extension)', muscle: 'triceps', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'isolation', cue: 'Lower bar to crown of head, keep elbows tucked' },
  { id: 'close_grip_bench', name: 'Close-Grip Bench Press', muscle: 'triceps,chest', sets: 3, reps: '6–10', rir: '1–2', rest: 120, type: 'compound', cue: 'Hands shoulder-width apart, elbows tucked to sides' },
  { id: 'jm_press', name: 'JM Press (Smith Machine / Barbell)', muscle: 'triceps', sets: 3, reps: '8–10', rir: '1–2', rest: 90, type: 'compound', cue: 'Hybrid close-grip bench and skull crusher' },
  { id: 'tricep_dips', name: 'Upright Triceps Dips', muscle: 'triceps,chest', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', bodyweight: true, cue: 'Keep torso upright to focus load onto triceps' },
  { id: 'cable_kickback', name: 'Single-Arm Cable Triceps Kickback', muscle: 'triceps', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Upper arm parallel to floor, full lockout contraction' },

  // ── Quads & Glutes ──
  { id: 'squat', name: 'Barbell Back Squat', muscle: 'quads,glutes', sets: 3, reps: '6–10', rir: '1–2', rest: 150, type: 'compound', cue: 'Break at knees and hips, hit parallel depth' },
  { id: 'front_squat', name: 'Barbell Front Squat', muscle: 'quads', sets: 3, reps: '6–8', rir: '1–2', rest: 150, type: 'compound', cue: 'Upright torso quad emphasis' },
  { id: 'hack_squat', name: 'Hack Squat (Machine)', muscle: 'quads,glutes', sets: 3, reps: '8–10', rir: '1–2', rest: 150, type: 'machine', cue: 'Feet low on platform for maximum knee flexion' },
  { id: 'leg_press', name: 'Leg Press (45° Sled)', muscle: 'quads,glutes', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'machine', cue: 'Control descent, do not round lower back off pad' },
  { id: 'pendulum_squat', name: 'Pendulum Squat', muscle: 'quads', sets: 3, reps: '8–10', rir: '1–2', rest: 120, type: 'machine', cue: 'Deep knee bend, quad isolation with back support' },
  { id: 'smith_squat', name: 'Smith Machine Squat (Feet Forward)', muscle: 'quads', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'machine', cue: 'Feet forward to minimize lower back strain' },
  { id: 'bulgarian_split', name: 'Bulgarian Split Squat (Dumbbells)', muscle: 'quads,glutes', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Rear foot elevated on bench, drop knee straight down' },
  { id: 'walking_lunge', name: 'Walking Dumbbell Lunges', muscle: 'quads,glutes', sets: 3, reps: '10–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Long stride, push through lead heel' },
  { id: 'leg_extension', name: 'Leg Extension (Machine)', muscle: 'quads', sets: 3, reps: '10–15', rir: '0–1', rest: 75, type: 'isolation', cue: 'Pause at top extension, slow 3-second negative' },
  { id: 'goblet_squat', name: 'Goblet Squat (Dumbbell)', muscle: 'quads', sets: 3, reps: '10–15', rir: '1–2', rest: 60, type: 'compound', cue: 'Hold heavy dumbbell at chest, squat between knees' },

  // ── Hamstrings & Glutes ──
  { id: 'romanian_deadlift', name: 'Barbell Romanian Deadlift (RDL)', muscle: 'hamstrings,glutes', sets: 3, reps: '8–10', rir: '1–2', rest: 120, type: 'compound', cue: 'Soft knees, push hips backward until deep hamstring stretch' },
  { id: 'db_rdl', name: 'Dumbbell Romanian Deadlift', muscle: 'hamstrings,glutes', sets: 3, reps: '8–12', rir: '1–2', rest: 90, type: 'compound', cue: 'Dumbbells track close to shins, focus on pure hip hinge' },
  { id: 'stiff_leg_deadlift', name: 'Stiff-Legged Deadlift (from floor)', muscle: 'hamstrings,glutes', sets: 3, reps: '6–8', rir: '1–2', rest: 150, type: 'compound', cue: 'High hip hinge, bar to floor with strict hamstring stretch' },
  { id: 'hamstring_curl', name: 'Seated Leg Curl (Machine)', muscle: 'hamstrings', sets: 3, reps: '10–12', rir: '0–1', rest: 75, type: 'machine', cue: 'Lean torso forward slightly for greater hamstring stretch' },
  { id: 'lying_leg_curl', name: 'Lying Leg Curl (Machine)', muscle: 'hamstrings', sets: 3, reps: '8–12', rir: '0–1', rest: 75, type: 'machine', cue: 'Keep hips pressed firmly into pad' },
  { id: 'hip_thrust', name: 'Barbell Hip Thrust', muscle: 'hamstrings,glutes', sets: 3, reps: '8–12', rir: '1–2', rest: 120, type: 'compound', cue: 'Upper back on bench, drive hips up to full lockout' },
  { id: 'machine_glute_drive', name: 'Machine Glute Drive / Hip Thrust', muscle: 'hamstrings,glutes', sets: 3, reps: '10–12', rir: '1–2', rest: 90, type: 'machine', cue: 'Buckle waist belt, squeeze glutes at the top' },

  // ── Calves & Forearms ──
  { id: 'calves', name: 'Standing Calf Raise (Machine)', muscle: 'calves', sets: 3, reps: '12–20', rir: '0–1', rest: 60, type: 'isolation', cue: 'Full 2-second stretch at bottom, explode up on balls of feet' },
  { id: 'seated_calf_raise', name: 'Seated Calf Raise (Soleus)', muscle: 'calves', sets: 3, reps: '12–20', rir: '0–1', rest: 60, type: 'isolation', cue: 'Knees bent 90°, targets soleus muscle' },
  { id: 'leg_press_calf', name: 'Leg Press Calf Press', muscle: 'calves', sets: 3, reps: '12–20', rir: '0–1', rest: 60, type: 'machine', cue: 'Deep ankle dorsiflexion on lower sled lip' },
  { id: 'wrist_curl', name: 'Wrist Curl (Forearm Flexors)', muscle: 'forearms', sets: 3, reps: '15–20', rir: '0–1', rest: 60, type: 'isolation', cue: 'Forearms flat on thighs, curl wrists upwards' },
  { id: 'wrist_extension', name: 'Reverse Wrist Curl (Forearm Extensors)', muscle: 'forearms', sets: 3, reps: '15–20', rir: '0–1', rest: 60, type: 'isolation', cue: 'Overhand grip, lift knuckles toward ceiling' },
  { id: 'farmers_walk', name: "Farmer's Walk (Heavy Dumbbells)", muscle: 'forearms,back', sets: 3, reps: '30–45s', rir: '0–1', rest: 90, type: 'compound', cue: 'Brace core, walk with heavy dumbbells' },

  // ── Abs & Core ──
  { id: 'cable_crunch', name: 'Kneeling Cable Crunch (Rope)', muscle: 'abs', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'cable', cue: 'Curl ribcage toward pelvis, flex abs hard' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise / Knee Raise', muscle: 'abs', sets: 3, reps: '10–15', rir: '0–1', rest: 60, type: 'isolation', bodyweight: true, cue: 'Curl pelvis upwards to engage lower abs' },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscle: 'abs', sets: 3, reps: '8–12', rir: '1–2', rest: 75, type: 'compound', bodyweight: true, cue: 'Keep hollow body position, roll out with abs' },
  { id: 'machine_crunch', name: 'Seated Machine Ab Crunch', muscle: 'abs', sets: 3, reps: '12–15', rir: '0–1', rest: 60, type: 'machine', cue: 'Contract abs throughout entire range of motion' }
];

export function getCustomExercises() {
  if (profile && Array.isArray(profile.customExercises)) return profile.customExercises;
  var stored = ls('rg_custom_exercises', []);
  return Array.isArray(stored) ? stored : [];
}

export function saveCustomExercise(ex) {
  if (!ex || !ex.name) return null;
  var customList = getCustomExercises().slice();
  var normId = ex.id || ('custom_' + ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + Date.now().toString(36));
  var newEx = {
    id: normId,
    name: ex.name.trim(),
    muscle: (ex.muscle || 'other').toLowerCase().trim(),
    sets: parseInt(ex.sets, 10) || 3,
    reps: (ex.reps || '8–12').trim(),
    rir: (ex.rir || '1–2').trim(),
    rest: parseInt(ex.rest, 10) || 90,
    cue: (ex.cue || '').trim(),
    weightIncrement: parseFloat(ex.weightIncrement) || 2.5,
    type: ex.type || 'compound',
    bodyweight: ex.bodyweight === true || ex.isBW === true
  };

  var existingIdx = customList.findIndex(function(e) { return e.id === normId || e.name.toLowerCase() === newEx.name.toLowerCase(); });
  if (existingIdx >= 0) {
    customList[existingIdx] = newEx;
  } else {
    customList.push(newEx);
  }

  if (profile) {
    profile.customExercises = customList;
    sv('rg_profile', profile);
  }
  sv('rg_custom_exercises', customList);
  return newEx;
}

export function getAllKnownExercises() {
  var seen = {};
  var result = [];

  function register(item) {
    if (!item || !item.name) return;
    var normKey = (item.id || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    if (seen[normKey]) return;
    seen[normKey] = true;
    result.push({
      id: item.id || normKey,
      name: item.name,
      muscle: item.muscle || 'other',
      sets: item.sets || 3,
      reps: item.reps || '8–12',
      rir: item.rir || '1–2',
      rest: item.rest != null ? item.rest : 90,
      cue: item.cue || '',
      weightIncrement: item.weightIncrement || 2.5,
      type: item.type || 'compound',
      bodyweight: item.bodyweight === true || item.isBW === true
    });
  }

  getCustomExercises().forEach(register);
  BUILTIN_EXERCISE_CATALOG.forEach(register);
  return result;
}
