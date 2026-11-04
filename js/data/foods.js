/* Food data: default 5-feeding meal plan, macro targets, and quick-add staples */

export var DEFAULT_MEAL_PLAN = {
  breakfast: {
    label: 'Breakfast',
    items: [
      {id:'bf_oats', name:'50g oats', kcal:195, protein:7, carbs:33, fat:3.5},
      {id:'bf_milk', name:'250ml whole milk', kcal:150, protein:8, carbs:12, fat:8},
      {id:'bf_dates', name:'2 medium dates', kcal:130, protein:1, carbs:35, fat:0},
      {id:'bf_eggs', name:'2 whole eggs', kcal:155, protein:13, carbs:1, fat:11}
    ]
  },
  lunch: {
    label: 'Lunch',
    items: [
      {id:'lh_rice', name:'250g cooked rice', kcal:325, protein:7, carbs:70, fat:1},
      {id:'lh_sabzi', name:'1 serving sabzi (veg)', kcal:100, protein:3, carbs:12, fat:4},
      {id:'lh_oil', name:'1 tbsp ghee / olive oil', kcal:120, protein:0, carbs:0, fat:14},
      {id:'lh_dahi', name:'150g dahi (curd)', kcal:90, protein:5, carbs:7, fat:5}
    ]
  },
  shake: {
    label: 'Post-Workout Shake',
    items: [
      {id:'sk_milk', name:'300ml whole milk', kcal:185, protein:10, carbs:14, fat:10},
      {id:'sk_oats', name:'40g oats', kcal:155, protein:7, carbs:26, fat:3},
      {id:'sk_pb', name:'1 tbsp peanut butter', kcal:95, protein:4, carbs:3, fat:8},
      {id:'sk_bananas', name:'2 bananas', kcal:210, protein:3, carbs:54, fat:1}
    ]
  },
  snack: {
    label: 'Evening Snack',
    items: [
      {id:'sn_eggs', name:'3 whole eggs in 2 tsp olive oil', kcal:315, protein:19, carbs:2, fat:25}
    ]
  },
  dinner: {
    label: 'Dinner',
    items: [
      {id:'dn_rice', name:'250g cooked rice', kcal:325, protein:7, carbs:70, fat:1},
      {id:'dn_sabzi', name:'1 serving sabzi (veg)', kcal:100, protein:3, carbs:12, fat:4},
      {id:'dn_oil', name:'1 tbsp ghee / olive oil', kcal:120, protein:0, carbs:0, fat:14},
      {id:'dn_paneer', name:'100g paneer', kcal:265, protein:18, carbs:1, fat:20}
    ]
  },
  additions: {
    label: 'Daily Additions',
    items: [
      {id:'ad_kiwi', name:'1 kiwi', kcal:42, protein:1, carbs:10, fat:0},
      {id:'ad_yogurt', name:'150g Greek yogurt', kcal:145, protein:14, carbs:6, fat:7}
    ]
  },
  gym_extras: {
    label: 'Gym Day Extras',
    gymOnly: true,
    items: [
      {id:'gm_bar', name:'1 protein bar', kcal:220, protein:20, carbs:22, fat:8},
      {id:'gm_bananas', name:'2 extra bananas', kcal:210, protein:3, carbs:54, fat:1}
    ]
  }
};

// ── Workout Programs ────────────────────────────────────────────────────────

export var DEFAULT_STAPLES = [
  { id: 'staple_eggs', icon: '', name: '3 Whole Eggs', kcal: 215, protein: 18, carbs: 1, fat: 15 },
  { id: 'staple_chicken', icon: '', name: 'Chicken 200g', kcal: 330, protein: 62, carbs: 0, fat: 7 },
  { id: 'staple_rice', icon: '', name: 'Rice 150g', kcal: 195, protein: 4, carbs: 42, fat: 1 },
  { id: 'staple_whey', icon: '', name: 'Whey 1 Scoop', kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 'staple_oats', icon: '', name: 'Oats 60g', kcal: 230, protein: 8, carbs: 40, fat: 4 }
];
