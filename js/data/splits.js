/* Workout split definitions: 2-day to 6-day routines and 7-day schedule map */

export var PROGRAM_2DAY = [
  { label: 'Day A', exercises: [
    {id:'leg_press',      name:'Leg Press',                muscle:'quads,glutes',    sets:3, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · full depth', type:'machine'},
    {id:'bench',          name:'Bench / Incline Press',    muscle:'chest,triceps',   sets:3, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · pause at chest', type:'compound'},
    {id:'lat_pulldown',   name:'Lat Pulldown',             muscle:'back,biceps',     sets:3, reps:'8–12', rir:'0–1', rest:90,  cue:'90s rest · squeeze at chest', type:'machine'},
    {id:'lateral_raise',  name:'Lateral Raise',            muscle:'shoulders',       sets:2, reps:'12–15',rir:'0–1', rest:60,  cue:'60s rest · control eccentric', type:'machine'}
  ]},
  { label: 'Day B', exercises: [
    {id:'rdl',            name:'Romanian Deadlift',        muscle:'hamstrings,glutes',sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · hinge, pause at stretch', type:'compound'},
    {id:'barbell_row',    name:'Row',                      muscle:'back,biceps',     sets:3, reps:'8–12', rir:'1–2', rest:120, cue:'2 min rest · pull to waist', type:'compound'},
    {id:'ohp',            name:'Overhead Press',           muscle:'shoulders,triceps',sets:2, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · press overhead', type:'compound'},
    {id:'bicep_curl',     name:'Biceps Curl',              muscle:'biceps',          sets:2, reps:'10–12',rir:'0–1', rest:90,  cue:'90s rest · squeeze biceps', type:'machine'}
  ]}
];

export var PROGRAM_3DAY = [
  { label: 'Day A', exercises: [
    {id:'squat',          name:'Squat (or Leg Press)',     muscle:'quads,glutes',    sets:3, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · squat deep', type:'compound'},
    {id:'bench',          name:'Bench Press',              muscle:'chest,triceps',   sets:3, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · bar to chest', type:'compound'},
    {id:'barbell_row',    name:'Row',                      muscle:'back,biceps',     sets:3, reps:'8–12', rir:'1–2', rest:120, cue:'2 min rest · barbell or dumbbell row', type:'compound'},
    {id:'lateral_raise',  name:'Lateral Raise',            muscle:'shoulders',       sets:2, reps:'12–15',rir:'0–1', rest:60,  cue:'60s rest · lateral raise', type:'machine'}
  ]},
  { label: 'Day B', exercises: [
    {id:'rdl',            name:'Romanian Deadlift',        muscle:'hamstrings,glutes',sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · pause at stretch', type:'compound'},
    {id:'ohp',            name:'Overhead Press',           muscle:'shoulders,triceps',sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · vertical press', type:'compound'},
    {id:'lat_pulldown',   name:'Lat Pulldown',             muscle:'back,biceps',     sets:3, reps:'8–12', rir:'0–1', rest:90,  cue:'90s rest · squeeze shoulder blades', type:'machine'},
    {id:'bicep_curl',     name:'Biceps Curl',              muscle:'biceps',          sets:2, reps:'10–12',rir:'0–1', rest:90,  cue:'90s rest · contract biceps', type:'machine'}
  ]},
  { label: 'Day C', exercises: [
    {id:'leg_press',      name:'Leg Press (or Squat)',     muscle:'quads,glutes',    sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · leg press', type:'machine'},
    {id:'incline_bench',  name:'Incline DB Press',         muscle:'chest,triceps',   sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · dumbbell press', type:'compound'},
    {id:'cable_row',      name:'Cable Row',                muscle:'back,biceps',     sets:3, reps:'8–12', rir:'0–1', rest:90,  cue:'90s rest · horizontal cable row', type:'machine'},
    {id:'tricep_push',    name:'Close-Grip Bench or Triceps Pressdown',muscle:'triceps',sets:2, reps:'10–12',rir:'0–1', rest:90,  cue:'90s rest · triceps overload', type:'machine'}
  ]}
];

export var PROGRAM_4DAY = [
  { label: 'Day 1 (Lower)', exercises: [
    {id:'squat',          name:'Squat',                    muscle:'quads,glutes',    sets:3, reps:'8',    rir:'1–2', rest:150, cue:'2.5 min rest · squat patterns', type:'compound'},
    {id:'leg_press',      name:'Leg Press',                muscle:'quads,glutes',    sets:3, reps:'10',   rir:'1–2', rest:120, cue:'2 min rest · leg press volume', type:'machine'},
    {id:'leg_curl',       name:'Leg Curl',                 muscle:'hamstrings',      sets:3, reps:'10',   rir:'0–1', rest:90,  cue:'90s rest · hamstring curl', type:'machine'},
    {id:'calf_stand',     name:'Standing Calf Raise',      muscle:'calves',          sets:3, reps:'15',   rir:'0–1', rest:60,  cue:'60s rest · full stretch at bottom', type:'machine'}
  ]},
  { label: 'Day 2 (Upper)', exercises: [
    {id:'bench',          name:'Bench Press',              muscle:'chest,triceps',   sets:3, reps:'8',    rir:'1–2', rest:150, cue:'2.5 min rest · flat bench press', type:'compound'},
    {id:'ohp',            name:'Overhead Press',           muscle:'shoulders,triceps',sets:3, reps:'8',    rir:'1–2', rest:120, cue:'2 min rest · overhead press', type:'compound'},
    {id:'lateral_raise',  name:'Lateral Raise',            muscle:'shoulders',       sets:3, reps:'15',   rir:'0–1', rest:60,  cue:'60s rest · lateral raise', type:'machine'},
    {id:'tricep_push',    name:'Triceps Pressdown',        muscle:'triceps',         sets:2, reps:'10',   rir:'0–1', rest:90,  cue:'90s rest · tricep pump', type:'machine'}
  ]},
  { label: 'Day 3 (Lower)', exercises: [
    {id:'rdl',            name:'Romanian Deadlift',        muscle:'hamstrings,glutes',sets:3, reps:'8',    rir:'1–2', rest:120, cue:'2 min rest · RDL stretch', type:'compound'},
    {id:'leg_ext',        name:'Leg Extension',            muscle:'quads',           sets:3, reps:'12',   rir:'0–1', rest:90,  cue:'90s rest · quad isolation', type:'machine'},
    {id:'hip_thrust',     name:'Hip Thrust',               muscle:'hamstrings,glutes',sets:3, reps:'10',   rir:'1–2', rest:120, cue:'2 min rest · glute overload', type:'compound'},
    {id:'calf_stand',     name:'Standing Calf Raise',      muscle:'calves',          sets:3, reps:'15',   rir:'0–1', rest:60,  cue:'60s rest · calf stretch', type:'machine'}
  ]},
  { label: 'Day 4 (Upper)', exercises: [
    {id:'barbell_row',    name:'Row',                      muscle:'back,biceps',     sets:3, reps:'10',   rir:'1–2', rest:120, cue:'2 min rest · row variations', type:'compound'},
    {id:'lat_pulldown',   name:'Lat Pulldown',             muscle:'back,biceps',     sets:3, reps:'10',   rir:'0–1', rest:90,  cue:'90s rest · pulldowns', type:'machine'},
    {id:'rear_delt_fly',  name:'Rear-Delt Fly',            muscle:'shoulders',       sets:3, reps:'15',   rir:'0–1', rest:60,  cue:'60s rest · rear-delt pump', type:'machine'},
    {id:'bicep_curl',     name:'Biceps Curl',              muscle:'biceps',          sets:2, reps:'10',   rir:'0–1', rest:90,  cue:'90s rest · biceps pump', type:'machine'}
  ]}
];

export var PROGRAM_5DAY = [
  { label: 'Day 1 (Push)', exercises: [
    {id:'machine_chest',    name:'Machine Chest Press',        muscle:'chest,triceps',   sets:2, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · smooth lockout', type:'machine'},
    {id:'shoulder_press',   name:'Machine Shoulder Press',     muscle:'shoulders,triceps', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · brace core', type:'machine'},
    {id:'cable_fly',        name:'Cable Fly / Pec Deck',       muscle:'chest',          sets:3, reps:'10–12', rir:'0–1', rest:75,  cue:'75s rest · squeeze at peak', type:'machine'},
    {id:'cable_lateral',    name:'Cable Lateral Raise',        muscle:'shoulders',      sets:3, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · keep slight bend', type:'machine'}
  ]},
  { label: 'Day 2 (Pull)', exercises: [
    {id:'lat_pulldown',     name:'Lat Pulldown',               muscle:'back,biceps',    sets:4, reps:'8–10', rir:'0–1', rest:90,  cue:'90s rest · strong elbow drive', type:'machine'},
    {id:'cable_row',        name:'Cable Row',                  muscle:'back,biceps',    sets:4, reps:'8–12', rir:'1–2', rest:90,  cue:'90s rest · chest to pad', type:'machine'},
    {id:'single_arm_cable', name:'Single-Arm Cable Row',       muscle:'back,biceps',    sets:3, reps:'10–12', rir:'0–1', rest:60,  cue:'60s rest · one side at a time', type:'machine'},
    {id:'bicep_curl',       name:'EZ-Bar / Machine Curl',      muscle:'biceps',         sets:3, reps:'8–12', rir:'0–1', rest:75,  cue:'75s rest · full squeeze', type:'machine'}
  ]},
  { label: 'Day 3 (Legs)', exercises: [
    {id:'hack_squat',       name:'Hack Squat',                 muscle:'quads,glutes',   sets:4, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · full depth', type:'machine'},
    {id:'leg_curl',         name:'Seated Leg Curl',            muscle:'hamstrings',     sets:3, reps:'8–10', rir:'1–2', rest:90,  cue:'90s rest · slow lowering', type:'machine'},
    {id:'leg_extension',    name:'Leg Extension',              muscle:'quads',          sets:3, reps:'10–12', rir:'0–1', rest:75,  cue:'75s rest · strong peak contraction', type:'machine'},
    {id:'calf_press',       name:'Calf Press',                 muscle:'calves',         sets:4, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · pause at top', type:'machine'}
  ]},
  { label: 'Day 4 (Upper)', exercises: [
    {id:'incline_bench',    name:'Incline DB Press',           muscle:'chest,triceps',  sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · 30–45° incline', type:'compound'},
    {id:'ohp',              name:'Shoulder Press',             muscle:'shoulders,triceps', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · strict overhead press', type:'compound'},
    {id:'rear_delt_fly',    name:'Rear-Delt Fly',              muscle:'shoulders',      sets:3, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · rear delt focus', type:'machine'},
    {id:'tricep_push',      name:'Triceps Pressdown',          muscle:'triceps',        sets:3, reps:'10–12', rir:'0–1', rest:60,  cue:'60s rest · slow extension', type:'machine'}
  ]},
  { label: 'Day 5 (Lower)', exercises: [
    {id:'rdl',              name:'Romanian Deadlift',          muscle:'hamstrings,glutes', sets:4, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · hinge and pause', type:'compound'},
    {id:'hip_thrust',       name:'Hip Thrust / Glute Drive',   muscle:'hamstrings,glutes', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · drive through heels', type:'machine'},
    {id:'leg_press',        name:'Leg Press',                  muscle:'quads,glutes',   sets:3, reps:'10–12', rir:'1–2', rest:120, cue:'2 min rest · controlled tempo', type:'machine'},
    {id:'calf_stand',       name:'Standing Calf Raise',        muscle:'calves',         sets:4, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · stretch at bottom', type:'machine'}
  ]}
];

export var PROGRAM_6DAY = [
  { label: 'Day 1 (Push A)', exercises: [
    {id:'machine_chest',    name:'Machine Chest Press',        muscle:'chest,triceps',   sets:2, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · controlled press', type:'machine'},
    {id:'shoulder_press',   name:'Machine Shoulder Press',     muscle:'shoulders,triceps', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · brace and lock out', type:'machine'},
    {id:'cable_fly',        name:'Cable Fly / Pec Deck',       muscle:'chest',          sets:3, reps:'10–12', rir:'0–1', rest:75,  cue:'75s rest · slow squeeze', type:'machine'},
    {id:'cable_lateral',    name:'Cable Lateral Raise',        muscle:'shoulders',      sets:3, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · slight bend', type:'machine'}
  ]},
  { label: 'Day 2 (Pull A)', exercises: [
    {id:'lat_pulldown',     name:'Lat Pulldown',               muscle:'back,biceps',    sets:4, reps:'8–10', rir:'0–1', rest:90,  cue:'90s rest · full stretch', type:'machine'},
    {id:'cable_row',        name:'Cable Row',                  muscle:'back,biceps',    sets:4, reps:'8–12', rir:'1–2', rest:90,  cue:'90s rest · chest to pad', type:'machine'},
    {id:'rear_delt_fly',    name:'Rear-Delt Fly',              muscle:'shoulders',      sets:3, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · rear-delt focus', type:'machine'},
    {id:'bicep_curl',       name:'EZ-Bar / Machine Curl',      muscle:'biceps',         sets:3, reps:'8–12', rir:'0–1', rest:75,  cue:'75s rest · squeeze hard', type:'machine'}
  ]},
  { label: 'Day 3 (Legs A)', exercises: [
    {id:'hack_squat',       name:'Hack Squat',                 muscle:'quads,glutes',   sets:4, reps:'8–10', rir:'1–2', rest:150, cue:'2.5 min rest · full depth', type:'machine'},
    {id:'leg_extension',    name:'Leg Extension',              muscle:'quads',          sets:3, reps:'10–12', rir:'0–1', rest:75,  cue:'75s rest · quad isolation', type:'machine'},
    {id:'leg_curl',         name:'Seated Leg Curl',            muscle:'hamstrings',     sets:3, reps:'8–10', rir:'1–2', rest:90,  cue:'90s rest · slow lowering', type:'machine'},
    {id:'calf_press',       name:'Calf Press',                 muscle:'calves',         sets:4, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · pause at top', type:'machine'}
  ]},
  { label: 'Day 4 (Push B)', exercises: [
    {id:'incline_bench',    name:'Incline DB Press',           muscle:'chest,triceps',  sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · angle focus', type:'compound'},
    {id:'ohp',              name:'Shoulder Press',             muscle:'shoulders,triceps', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · strict', type:'compound'},
    {id:'tricep_push',      name:'Triceps Pressdown',          muscle:'triceps',        sets:3, reps:'10–12', rir:'0–1', rest:60,  cue:'60s rest · slow extension', type:'machine'},
    {id:'cable_lateral',    name:'Cable Lateral Raise',        muscle:'shoulders',      sets:3, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · slight bend', type:'machine'}
  ]},
  { label: 'Day 5 (Pull B)', exercises: [
    {id:'single_arm_cable', name:'Single-Arm Cable Row',       muscle:'back,biceps',    sets:3, reps:'10–12', rir:'0–1', rest:60,  cue:'60s rest · alternate sides', type:'machine'},
    {id:'lat_pulldown',     name:'Assisted Pull-Up / Pulldown', muscle:'back,biceps',   sets:3, reps:'8–12', rir:'0–1', rest:90,  cue:'90s rest · slow tempo', type:'machine'},
    {id:'barbell_row',      name:'Barbell / T-Bar Row',        muscle:'back,biceps',    sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · full row', type:'compound'},
    {id:'cable_curl',       name:'Cable Curl',                 muscle:'biceps',         sets:3, reps:'10–12', rir:'0–1', rest:75,  cue:'75s rest · elbow stable', type:'machine'}
  ]},
  { label: 'Day 6 (Legs B)', exercises: [
    {id:'rdl',              name:'Romanian Deadlift',          muscle:'hamstrings,glutes', sets:4, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · hinge and pause', type:'compound'},
    {id:'hip_thrust',       name:'Hip Thrust / Glute Drive',   muscle:'hamstrings,glutes', sets:3, reps:'8–10', rir:'1–2', rest:120, cue:'2 min rest · drive through heels', type:'machine'},
    {id:'leg_press',        name:'Leg Press',                  muscle:'quads,glutes',   sets:3, reps:'10–12', rir:'1–2', rest:120, cue:'2 min rest · controlled tempo', type:'machine'},
    {id:'calf_stand',       name:'Standing Calf Raise',        muscle:'calves',         sets:4, reps:'12–15', rir:'0–1', rest:60,  cue:'60s rest · stretch at bottom', type:'machine'}
  ]}
];


export var DEFAULT_5DAY_ROUTINE = [
  {
    label: 'Day 1 — Chest & Back A',
    dayIndex: 0,
    scheduleDay: 1,
    exercises: [
      {id:'incline_bench', name:'Barbell Incline Bench Press', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'triceps', sets:2, reps:'6–10', rir:'1–2', rest:150, cue:'Upper chest', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'machine_row', name:'Machine Row', muscle:'back', primaryMuscle:'back', secondaryMuscle:'biceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Mid back', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'chest_press_machine', name:'Chest Press Machine', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'triceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Chest', weightIncrement:2.5, type:'machine', isCompound:true},
      {id:'lat_pulldown', name:'Lat Pulldown', muscle:'back', primaryMuscle:'back', secondaryMuscle:'biceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Lats', weightIncrement:2.5, type:'cable', isCompound:true},
      {id:'pec_deck', name:'Pec Deck Fly', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Chest stretch', weightIncrement:2.5, type:'isolation', isCompound:false}
    ]
  },
  {
    label: 'Day 2 — Legs & Shoulders A',
    dayIndex: 1,
    scheduleDay: 2,
    exercises: [
      {id:'leg_press', name:'Leg Press', muscle:'quads,glutes', primaryMuscle:'quads', secondaryMuscle:'glutes', sets:2, reps:'8–12', rir:'1–2', rest:150, cue:'Quads & glutes', weightIncrement:5, type:'compound', isCompound:true},
      {id:'romanian_deadlift', name:'Romanian Deadlift', muscle:'hamstrings', primaryMuscle:'hamstrings', secondaryMuscle:'glutes', sets:2, reps:'8–12', rir:'1–2', rest:150, cue:'Hamstrings & hinge', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'leg_extension', name:'Leg Extension', muscle:'quads', primaryMuscle:'quads', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Quads', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'hamstring_curl', name:'Hamstring Curl', muscle:'hamstrings', primaryMuscle:'hamstrings', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Hamstrings', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'shoulder_press_machine', name:'Shoulder Press Machine', muscle:'shoulders', primaryMuscle:'shoulders', secondaryMuscle:'triceps', sets:2, reps:'6–10', rir:'1–2', rest:120, cue:'Deltoids', weightIncrement:2.5, type:'machine', isCompound:true},
      {id:'lateral_raise_machine', name:'Lateral Raise Machine', muscle:'shoulders', primaryMuscle:'shoulders', secondaryMuscle:'', sets:3, reps:'10–15', rir:'1–2', rest:90, cue:'Side delts', weightIncrement:1.25, type:'isolation', isCompound:false}
    ]
  },
  {
    label: 'Day 3 — Arms',
    dayIndex: 2,
    scheduleDay: 4,
    exercises: [
      {id:'ez_bar_curl', name:'EZ-Bar Curl', muscle:'biceps', primaryMuscle:'biceps', secondaryMuscle:'', sets:2, reps:'8–12', rir:'1–2', rest:90, cue:'Biceps', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'overhead_triceps_ext', name:'Overhead Triceps Extension', muscle:'triceps', primaryMuscle:'triceps', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Triceps overhead stretch', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'hammer_curl', name:'Hammer Curl', muscle:'forearms', primaryMuscle:'forearms', secondaryMuscle:'biceps', sets:2, reps:'8–12', rir:'1–2', rest:90, cue:'Brachialis & forearms', weightIncrement:2, type:'isolation', isCompound:false},
      {id:'triceps_pushdown', name:'Triceps Pushdown', muscle:'triceps', primaryMuscle:'triceps', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Triceps lateral head', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'incline_db_curl', name:'Incline Dumbbell Curl', muscle:'biceps', primaryMuscle:'biceps', secondaryMuscle:'', sets:2, reps:'8–12', rir:'1–2', rest:90, cue:'Biceps stretch', weightIncrement:2, type:'isolation', isCompound:false}
    ]
  },
  {
    label: 'Day 4 — Chest & Back B',
    dayIndex: 3,
    scheduleDay: 5,
    exercises: [
      {id:'bench', name:'Flat Bench Press', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'triceps', sets:2, reps:'6–10', rir:'1–2', rest:150, cue:'Chest', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'machine_row_b', name:'Machine Row', muscle:'back', primaryMuscle:'back', secondaryMuscle:'biceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Mid back', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'incline_db_press', name:'Incline Dumbbell Press', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'triceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Upper chest', weightIncrement:2, type:'compound', isCompound:true},
      {id:'lat_pulldown_b', name:'Lat Pulldown', muscle:'back', primaryMuscle:'back', secondaryMuscle:'biceps', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Lats', weightIncrement:2.5, type:'cable', isCompound:true},
      {id:'close_grip_bench', name:'Close-Grip Bench Press (flat bench)', muscle:'triceps,chest', primaryMuscle:'triceps', secondaryMuscle:'chest', sets:2, reps:'8–12', rir:'1–2', rest:120, cue:'Triceps & chest', weightIncrement:2.5, type:'compound', isCompound:true},
      {id:'pec_deck_b', name:'Pec Deck Fly', muscle:'chest', primaryMuscle:'chest', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Chest stretch', weightIncrement:2.5, type:'isolation', isCompound:false}
    ]
  },
  {
    label: 'Day 5 — Legs & Shoulders B',
    dayIndex: 4,
    scheduleDay: 6,
    exercises: [
      {id:'hamstring_curl_b', name:'Hamstring Curl', muscle:'hamstrings', primaryMuscle:'hamstrings', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Hamstrings', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'leg_extension_b', name:'Leg Extension', muscle:'quads', primaryMuscle:'quads', secondaryMuscle:'', sets:2, reps:'10–15', rir:'1–2', rest:90, cue:'Quads', weightIncrement:2.5, type:'isolation', isCompound:false},
      {id:'shoulder_press_b', name:'Shoulder Press Machine', muscle:'shoulders', primaryMuscle:'shoulders', secondaryMuscle:'triceps', sets:2, reps:'6–10', rir:'1–2', rest:120, cue:'Deltoids', weightIncrement:2.5, type:'machine', isCompound:true},
      {id:'lateral_raise_b', name:'Lateral Raise Machine', muscle:'shoulders', primaryMuscle:'shoulders', secondaryMuscle:'', sets:3, reps:'10–15', rir:'1–2', rest:90, cue:'Side delts', weightIncrement:1.25, type:'isolation', isCompound:false},
      {id:'rear_delt_fly', name:'Rear Delt Fly', muscle:'shoulders', primaryMuscle:'shoulders', secondaryMuscle:'', sets:2, reps:'15', rir:'1–2', rest:90, cue:'Rear delts', weightIncrement:2.5, type:'isolation', isCompound:false, setTags:[null, 'rest-pause (15+5+5, 0 RIR)']},
      {id:'calves', name:'Calves', muscle:'calves', primaryMuscle:'calves', secondaryMuscle:'', sets:2, reps:'12–20', rir:'1–2', rest:60, cue:'Calves', weightIncrement:2.5, type:'isolation', isCompound:false}
    ]
  }
];

export var SCHEDULE_7DAY = [
  { dayNum: 1, name: 'Day 1', weekday: 'Mon', label: 'Day 1 — Chest & Back A', isRest: false, workoutIndex: 0 },
  { dayNum: 2, name: 'Day 2', weekday: 'Tue', label: 'Day 2 — Legs & Shoulders A', isRest: false, workoutIndex: 1 },
  { dayNum: 3, name: 'Day 3', weekday: 'Wed', label: 'Rest Day', isRest: true, workoutIndex: null },
  { dayNum: 4, name: 'Day 4', weekday: 'Thu', label: 'Day 3 — Arms', isRest: false, workoutIndex: 2 },
  { dayNum: 5, name: 'Day 5', weekday: 'Fri', label: 'Day 4 — Chest & Back B', isRest: false, workoutIndex: 3 },
  { dayNum: 6, name: 'Day 6', weekday: 'Sat', label: 'Day 5 — Legs & Shoulders B', isRest: false, workoutIndex: 4 },
  { dayNum: 7, name: 'Day 7', weekday: 'Sun', label: 'Rest Day', isRest: true, workoutIndex: null }
];
