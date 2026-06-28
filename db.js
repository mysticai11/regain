// db.js — Food Database & IndexedDB Wrapper for Regain
// Nutrition data from USDA FoodData Central (public domain)
// All macro values are per 100g. serving_g is the common serving weight in grams.
'use strict';

var FOODS = [
  // ─── MEAT & POULTRY ───────────────────────────────────────────────────────
  {id:1,  name:'Chicken breast, cooked',         kcal:165, protein:31.0, carbs:0,    fat:3.6,  serving_g:150, unit:'1 breast'},
  {id:2,  name:'Chicken thigh, cooked',          kcal:209, protein:26.0, carbs:0,    fat:10.9, serving_g:100, unit:'100g'},
  {id:3,  name:'Chicken wing, cooked',           kcal:290, protein:27.0, carbs:0,    fat:19.0, serving_g:34,  unit:'1 wing'},
  {id:4,  name:'Ground beef 80/20, cooked',      kcal:254, protein:26.0, carbs:0,    fat:17.0, serving_g:100, unit:'100g'},
  {id:5,  name:'Ground beef 90/10, cooked',      kcal:196, protein:26.0, carbs:0,    fat:9.7,  serving_g:100, unit:'100g'},
  {id:6,  name:'Beef sirloin steak, cooked',     kcal:207, protein:26.0, carbs:0,    fat:11.0, serving_g:170, unit:'1 steak'},
  {id:7,  name:'Beef tenderloin, cooked',        kcal:219, protein:27.0, carbs:0,    fat:12.0, serving_g:170, unit:'1 steak'},
  {id:8,  name:'Beef T-bone steak, cooked',      kcal:247, protein:24.0, carbs:0,    fat:16.0, serving_g:170, unit:'1 steak'},
  {id:9,  name:'Beef liver, cooked',             kcal:175, protein:27.0, carbs:5.1,  fat:4.9,  serving_g:100, unit:'100g'},
  {id:10, name:'Pork loin, cooked',              kcal:242, protein:27.0, carbs:0,    fat:14.0, serving_g:100, unit:'100g'},
  {id:11, name:'Pork tenderloin, cooked',        kcal:166, protein:26.0, carbs:0,    fat:6.0,  serving_g:100, unit:'100g'},
  {id:12, name:'Pork chop, cooked',              kcal:231, protein:26.0, carbs:0,    fat:14.0, serving_g:130, unit:'1 chop'},
  {id:13, name:'Bacon, cooked',                  kcal:541, protein:37.0, carbs:1.4,  fat:42.0, serving_g:28,  unit:'2 strips'},
  {id:14, name:'Ham, cured',                     kcal:149, protein:19.0, carbs:0,    fat:7.7,  serving_g:85,  unit:'3 oz'},
  {id:15, name:'Turkey breast, cooked',          kcal:189, protein:29.0, carbs:0,    fat:7.4,  serving_g:100, unit:'100g'},
  {id:16, name:'Ground turkey, cooked',          kcal:218, protein:27.0, carbs:0,    fat:12.0, serving_g:100, unit:'100g'},
  {id:17, name:'Lamb chop, cooked',              kcal:294, protein:25.0, carbs:0,    fat:21.0, serving_g:100, unit:'100g'},
  {id:18, name:'Hot dog, beef',                  kcal:290, protein:11.0, carbs:3.4,  fat:26.0, serving_g:57,  unit:'1 frank'},
  {id:19, name:'Pepperoni',                      kcal:494, protein:22.0, carbs:1.6,  fat:44.0, serving_g:28,  unit:'14 slices'},
  {id:20, name:'Salami, beef',                   kcal:338, protein:18.0, carbs:0.7,  fat:29.0, serving_g:28,  unit:'3 slices'},
  {id:21, name:'Deli turkey breast',             kcal:104, protein:17.0, carbs:3.6,  fat:2.4,  serving_g:56,  unit:'2 oz'},
  {id:22, name:'Rotisserie chicken',             kcal:190, protein:26.0, carbs:0,    fat:9.0,  serving_g:140, unit:'~5 oz'},
  {id:23, name:'Beef jerky',                     kcal:299, protein:33.0, carbs:12.0, fat:12.0, serving_g:28,  unit:'1 oz'},
  {id:24, name:'Chicken breast, raw',            kcal:120, protein:22.5, carbs:0,    fat:2.6,  serving_g:200, unit:'1 large breast raw'},
  {id:25, name:'Ribeye steak, cooked',           kcal:291, protein:24.0, carbs:0,    fat:21.0, serving_g:170, unit:'1 steak'},
  // ─── SEAFOOD ─────────────────────────────────────────────────────────────
  {id:30, name:'Salmon, cooked',                 kcal:208, protein:20.0, carbs:0,    fat:13.0, serving_g:150, unit:'1 fillet'},
  {id:31, name:'Tuna, canned in water',          kcal:109, protein:25.0, carbs:0,    fat:0.5,  serving_g:140, unit:'1 can (5oz)'},
  {id:32, name:'Tuna, canned in oil',            kcal:198, protein:25.0, carbs:0,    fat:11.0, serving_g:140, unit:'1 can (5oz)'},
  {id:33, name:'Shrimp, cooked',                 kcal:99,  protein:24.0, carbs:0.2,  fat:0.3,  serving_g:100, unit:'100g'},
  {id:34, name:'Tilapia, cooked',                kcal:128, protein:26.0, carbs:0,    fat:2.7,  serving_g:150, unit:'1 fillet'},
  {id:35, name:'Cod, cooked',                    kcal:105, protein:23.0, carbs:0,    fat:0.9,  serving_g:150, unit:'1 fillet'},
  {id:36, name:'Sardines, canned in oil',        kcal:208, protein:25.0, carbs:0,    fat:11.0, serving_g:92,  unit:'1 can (3.2oz)'},
  {id:37, name:'Mackerel, cooked',               kcal:262, protein:24.0, carbs:0,    fat:18.0, serving_g:100, unit:'100g'},
  {id:38, name:'Halibut, cooked',                kcal:140, protein:27.0, carbs:0,    fat:3.0,  serving_g:150, unit:'1 fillet'},
  {id:39, name:'Trout, cooked',                  kcal:190, protein:26.0, carbs:0,    fat:9.0,  serving_g:150, unit:'1 fillet'},
  {id:40, name:'Crab, cooked',                   kcal:97,  protein:19.0, carbs:0,    fat:1.8,  serving_g:100, unit:'100g'},
  {id:41, name:'Tuna steak, cooked',             kcal:184, protein:30.0, carbs:0,    fat:6.3,  serving_g:150, unit:'1 steak'},
  // ─── EGGS & DAIRY ────────────────────────────────────────────────────────
  {id:50, name:'Whole egg, large',               kcal:143, protein:12.6, carbs:0.7,  fat:9.5,  serving_g:50,  unit:'1 large egg'},
  {id:51, name:'Egg whites',                     kcal:52,  protein:10.9, carbs:0.7,  fat:0.2,  serving_g:33,  unit:'1 large white'},
  {id:52, name:'Whole milk (3.25%)',             kcal:61,  protein:3.2,  carbs:4.8,  fat:3.3,  serving_g:244, unit:'1 cup'},
  {id:53, name:'Milk, 2%',                       kcal:50,  protein:3.4,  carbs:4.7,  fat:2.0,  serving_g:244, unit:'1 cup'},
  {id:54, name:'Milk, skim',                     kcal:35,  protein:3.4,  carbs:5.1,  fat:0.1,  serving_g:244, unit:'1 cup'},
  {id:55, name:'Greek yogurt, full-fat plain',   kcal:97,  protein:9.0,  carbs:3.6,  fat:5.0,  serving_g:200, unit:'3/4 cup'},
  {id:56, name:'Greek yogurt, 0% plain',         kcal:59,  protein:10.2, carbs:3.6,  fat:0.4,  serving_g:200, unit:'3/4 cup'},
  {id:57, name:'Cottage cheese, 2%',             kcal:90,  protein:11.6, carbs:4.3,  fat:2.5,  serving_g:113, unit:'1/2 cup'},
  {id:58, name:'Cottage cheese, 4%',             kcal:103, protein:11.1, carbs:3.4,  fat:4.5,  serving_g:113, unit:'1/2 cup'},
  {id:59, name:'Cheddar cheese',                 kcal:403, protein:25.0, carbs:1.3,  fat:33.0, serving_g:28,  unit:'1 oz slice'},
  {id:60, name:'Mozzarella cheese',              kcal:280, protein:28.0, carbs:2.2,  fat:17.0, serving_g:28,  unit:'1 oz'},
  {id:61, name:'Parmesan cheese',                kcal:431, protein:38.0, carbs:4.1,  fat:29.0, serving_g:5,   unit:'1 tbsp'},
  {id:62, name:'Cream cheese',                   kcal:342, protein:6.0,  carbs:4.1,  fat:34.0, serving_g:29,  unit:'2 tbsp'},
  {id:63, name:'Heavy cream',                    kcal:345, protein:2.1,  carbs:2.8,  fat:37.0, serving_g:15,  unit:'1 tbsp'},
  {id:64, name:'Butter, unsalted',               kcal:717, protein:0.9,  carbs:0.1,  fat:81.0, serving_g:14,  unit:'1 tbsp'},
  {id:65, name:'Sour cream',                     kcal:198, protein:2.4,  carbs:4.6,  fat:19.0, serving_g:30,  unit:'2 tbsp'},
  {id:66, name:'Ricotta, whole milk',            kcal:174, protein:11.3, carbs:3.0,  fat:13.0, serving_g:62,  unit:'1/4 cup'},
  {id:67, name:'Chocolate milk, whole',          kcal:83,  protein:3.4,  carbs:12.0, fat:3.1,  serving_g:244, unit:'1 cup'},
  {id:68, name:'String cheese, mozzarella',      kcal:280, protein:24.0, carbs:2.0,  fat:20.0, serving_g:28,  unit:'1 stick'},
  {id:69, name:'American cheese, processed',     kcal:376, protein:15.0, carbs:7.0,  fat:32.0, serving_g:21,  unit:'1 slice'},
  {id:70, name:'Brie cheese',                    kcal:334, protein:21.0, carbs:0.5,  fat:28.0, serving_g:28,  unit:'1 oz'},
  // ─── SUPPLEMENTS ─────────────────────────────────────────────────────────
  {id:80, name:'Whey protein powder',            kcal:370, protein:77.5, carbs:7.0,  fat:3.5,  serving_g:30,  unit:'1 scoop (30g)'},
  {id:81, name:'Casein protein powder',          kcal:360, protein:74.0, carbs:10.0, fat:3.0,  serving_g:35,  unit:'1 scoop (35g)'},
  {id:82, name:'Mass gainer (generic)',          kcal:376, protein:25.0, carbs:62.0, fat:3.5,  serving_g:150, unit:'3 scoops'},
  {id:83, name:'Creatine monohydrate',           kcal:0,   protein:0,    carbs:0,    fat:0,    serving_g:5,   unit:'1 tsp (5g)'},
  {id:84, name:'Protein bar (~20g protein)',     kcal:323, protein:30.8, carbs:38.5, fat:10.8, serving_g:65,  unit:'1 bar'},
  {id:85, name:'Collagen peptides powder',       kcal:364, protein:90.0, carbs:0,    fat:0,    serving_g:11,  unit:'1 scoop'},
  {id:86, name:'Pea protein powder',             kcal:370, protein:79.0, carbs:7.0,  fat:2.0,  serving_g:30,  unit:'1 scoop'},
  {id:87, name:'Weight gainer shake (made up)',  kcal:600, protein:40.0, carbs:80.0, fat:10.0, serving_g:600, unit:'1 shake (custom)'},
  // ─── GRAINS & STARCHES ───────────────────────────────────────────────────
  {id:100, name:'White rice, cooked',            kcal:130, protein:2.7,  carbs:28.0, fat:0.3,  serving_g:186, unit:'1 cup'},
  {id:101, name:'Brown rice, cooked',            kcal:112, protein:2.3,  carbs:24.0, fat:0.9,  serving_g:195, unit:'1 cup'},
  {id:102, name:'Oats, rolled (dry)',            kcal:389, protein:17.0, carbs:66.0, fat:7.0,  serving_g:80,  unit:'1 cup dry'},
  {id:103, name:'Oatmeal, cooked (plain)',       kcal:71,  protein:2.5,  carbs:12.0, fat:1.4,  serving_g:234, unit:'1 cup cooked'},
  {id:104, name:'White pasta, cooked',           kcal:158, protein:5.8,  carbs:31.0, fat:0.9,  serving_g:140, unit:'1 cup'},
  {id:105, name:'Whole wheat pasta, cooked',     kcal:174, protein:7.5,  carbs:37.0, fat:0.8,  serving_g:140, unit:'1 cup'},
  {id:106, name:'White bread',                   kcal:265, protein:9.0,  carbs:49.0, fat:3.2,  serving_g:30,  unit:'1 slice'},
  {id:107, name:'Whole wheat bread',             kcal:247, protein:13.0, carbs:41.0, fat:4.2,  serving_g:30,  unit:'1 slice'},
  {id:108, name:'Bagel, plain',                  kcal:270, protein:11.0, carbs:53.0, fat:1.7,  serving_g:105, unit:'1 bagel'},
  {id:109, name:'English muffin',                kcal:227, protein:8.5,  carbs:44.0, fat:1.6,  serving_g:57,  unit:'1 muffin'},
  {id:110, name:'Potato, white, baked',          kcal:93,  protein:2.5,  carbs:21.0, fat:0.1,  serving_g:173, unit:'1 medium'},
  {id:111, name:'Sweet potato, baked',           kcal:90,  protein:2.0,  carbs:21.0, fat:0.1,  serving_g:130, unit:'1 medium'},
  {id:112, name:'Corn, cooked',                  kcal:96,  protein:3.4,  carbs:21.0, fat:1.5,  serving_g:154, unit:'1 cup'},
  {id:113, name:'Quinoa, cooked',                kcal:120, protein:4.4,  carbs:21.0, fat:1.9,  serving_g:185, unit:'1 cup'},
  {id:114, name:'Sourdough bread',               kcal:274, protein:10.0, carbs:52.0, fat:2.0,  serving_g:50,  unit:'2 slices'},
  {id:115, name:'Flour tortilla, 10"',           kcal:296, protein:7.5,  carbs:50.0, fat:6.9,  serving_g:72,  unit:'1 large'},
  {id:116, name:'Pancakes, plain',               kcal:227, protein:6.3,  carbs:34.0, fat:7.9,  serving_g:100, unit:'2 medium'},
  {id:117, name:'Waffles, plain',                kcal:285, protein:6.5,  carbs:47.0, fat:8.0,  serving_g:75,  unit:'2 waffles'},
  {id:118, name:'Couscous, cooked',              kcal:112, protein:3.8,  carbs:23.0, fat:0.2,  serving_g:157, unit:'1 cup'},
  {id:119, name:'Barley, cooked',                kcal:123, protein:2.3,  carbs:28.0, fat:0.4,  serving_g:157, unit:'1 cup'},
  {id:120, name:'Granola',                       kcal:471, protein:11.0, carbs:64.0, fat:20.0, serving_g:58,  unit:'1/2 cup'},
  {id:121, name:'Instant oatmeal, plain',        kcal:379, protein:13.0, carbs:68.0, fat:6.9,  serving_g:28,  unit:'1 packet'},
  {id:122, name:'Corn flakes cereal',            kcal:357, protein:7.5,  carbs:84.0, fat:0.4,  serving_g:28,  unit:'1 cup'},
  {id:123, name:'French fries, fast food',       kcal:312, protein:3.8,  carbs:41.0, fat:15.0, serving_g:117, unit:'medium serving'},
  {id:124, name:'Pita bread',                    kcal:275, protein:9.1,  carbs:56.0, fat:1.2,  serving_g:60,  unit:'1 pita'},
  {id:125, name:'Croissant',                     kcal:406, protein:8.2,  carbs:46.0, fat:21.0, serving_g:57,  unit:'1 medium'},
  {id:126, name:'Rice crackers',                 kcal:387, protein:7.6,  carbs:80.0, fat:2.7,  serving_g:9,   unit:'1 cake'},
  // ─── FATS & OILS ─────────────────────────────────────────────────────────
  {id:140, name:'Olive oil',                     kcal:884, protein:0,    carbs:0,    fat:100,  serving_g:14,  unit:'1 tbsp'},
  {id:141, name:'Peanut butter',                 kcal:588, protein:25.0, carbs:20.0, fat:50.0, serving_g:32,  unit:'2 tbsp'},
  {id:142, name:'Almond butter',                 kcal:614, protein:21.0, carbs:19.0, fat:56.0, serving_g:32,  unit:'2 tbsp'},
  {id:143, name:'Tahini (sesame paste)',          kcal:595, protein:17.0, carbs:21.0, fat:54.0, serving_g:15,  unit:'1 tbsp'},
  {id:144, name:'Peanuts, dry roasted',          kcal:567, protein:26.0, carbs:16.0, fat:49.0, serving_g:28,  unit:'1 oz'},
  {id:145, name:'Almonds, raw',                  kcal:579, protein:21.0, carbs:22.0, fat:50.0, serving_g:28,  unit:'1 oz'},
  {id:146, name:'Cashews, raw',                  kcal:553, protein:18.0, carbs:30.0, fat:44.0, serving_g:28,  unit:'1 oz'},
  {id:147, name:'Walnuts, raw',                  kcal:654, protein:15.0, carbs:14.0, fat:65.0, serving_g:28,  unit:'1 oz'},
  {id:148, name:'Avocado',                       kcal:160, protein:2.0,  carbs:9.0,  fat:15.0, serving_g:150, unit:'1 medium'},
  {id:149, name:'Coconut oil',                   kcal:862, protein:0,    carbs:0,    fat:100,  serving_g:14,  unit:'1 tbsp'},
  {id:150, name:'Sunflower seeds',               kcal:584, protein:21.0, carbs:20.0, fat:51.0, serving_g:28,  unit:'1 oz'},
  {id:151, name:'Chia seeds',                    kcal:486, protein:17.0, carbs:42.0, fat:31.0, serving_g:28,  unit:'2 tbsp'},
  {id:152, name:'Flaxseeds, ground',             kcal:534, protein:18.0, carbs:29.0, fat:42.0, serving_g:10,  unit:'1 tbsp'},
  // ─── LEGUMES ─────────────────────────────────────────────────────────────
  {id:160, name:'Lentils, cooked',               kcal:116, protein:9.0,  carbs:20.0, fat:0.4,  serving_g:198, unit:'1 cup'},
  {id:161, name:'Chickpeas, cooked',             kcal:164, protein:8.9,  carbs:27.0, fat:2.6,  serving_g:164, unit:'1 cup'},
  {id:162, name:'Black beans, cooked',           kcal:132, protein:8.9,  carbs:24.0, fat:0.5,  serving_g:172, unit:'1 cup'},
  {id:163, name:'Kidney beans, cooked',          kcal:127, protein:8.7,  carbs:23.0, fat:0.5,  serving_g:177, unit:'1 cup'},
  {id:164, name:'Edamame, cooked',               kcal:121, protein:11.0, carbs:9.0,  fat:5.2,  serving_g:155, unit:'1 cup'},
  {id:165, name:'Tofu, firm',                    kcal:76,  protein:8.0,  carbs:1.9,  fat:4.2,  serving_g:126, unit:'1/2 cup'},
  {id:166, name:'Tempeh',                        kcal:193, protein:19.0, carbs:9.0,  fat:11.0, serving_g:100, unit:'100g'},
  {id:167, name:'Green peas, cooked',            kcal:84,  protein:5.4,  carbs:15.0, fat:0.4,  serving_g:160, unit:'1 cup'},
  {id:168, name:'Hummus',                        kcal:166, protein:7.9,  carbs:14.0, fat:9.6,  serving_g:60,  unit:'1/4 cup'},
  // ─── FRUITS ──────────────────────────────────────────────────────────────
  {id:180, name:'Banana',                        kcal:89,  protein:1.1,  carbs:23.0, fat:0.3,  serving_g:118, unit:'1 medium'},
  {id:181, name:'Apple',                         kcal:52,  protein:0.3,  carbs:14.0, fat:0.2,  serving_g:182, unit:'1 medium'},
  {id:182, name:'Orange',                        kcal:47,  protein:0.9,  carbs:12.0, fat:0.1,  serving_g:131, unit:'1 medium'},
  {id:183, name:'Strawberries',                  kcal:32,  protein:0.7,  carbs:7.7,  fat:0.3,  serving_g:152, unit:'1 cup'},
  {id:184, name:'Blueberries',                   kcal:57,  protein:0.7,  carbs:14.0, fat:0.3,  serving_g:148, unit:'1 cup'},
  {id:185, name:'Mango',                         kcal:60,  protein:0.8,  carbs:15.0, fat:0.4,  serving_g:165, unit:'1 cup diced'},
  {id:186, name:'Dates, Medjool',                kcal:282, protein:2.5,  carbs:75.0, fat:0.4,  serving_g:24,  unit:'2 dates'},
  {id:187, name:'Raisins',                       kcal:299, protein:3.1,  carbs:79.0, fat:0.5,  serving_g:43,  unit:'1/4 cup'},
  {id:188, name:'Pineapple',                     kcal:50,  protein:0.5,  carbs:13.0, fat:0.1,  serving_g:165, unit:'1 cup'},
  {id:189, name:'Watermelon',                    kcal:30,  protein:0.6,  carbs:7.6,  fat:0.2,  serving_g:280, unit:'2 cups'},
  {id:190, name:'Grapes',                        kcal:69,  protein:0.7,  carbs:18.0, fat:0.2,  serving_g:151, unit:'1 cup'},
  {id:191, name:'Peach',                         kcal:39,  protein:0.9,  carbs:10.0, fat:0.3,  serving_g:150, unit:'1 medium'},
  // ─── VEGETABLES ──────────────────────────────────────────────────────────
  {id:200, name:'Broccoli, cooked',              kcal:35,  protein:2.4,  carbs:7.2,  fat:0.4,  serving_g:156, unit:'1 cup'},
  {id:201, name:'Spinach, raw',                  kcal:23,  protein:2.9,  carbs:3.6,  fat:0.4,  serving_g:30,  unit:'1 cup'},
  {id:202, name:'Kale, raw',                     kcal:49,  protein:4.3,  carbs:9.0,  fat:0.9,  serving_g:67,  unit:'1 cup'},
  {id:203, name:'Carrot, raw',                   kcal:41,  protein:0.9,  carbs:10.0, fat:0.2,  serving_g:61,  unit:'1 medium'},
  {id:204, name:'Bell pepper',                   kcal:31,  protein:1.0,  carbs:7.0,  fat:0.3,  serving_g:119, unit:'1 medium'},
  {id:205, name:'Tomato',                        kcal:18,  protein:0.9,  carbs:3.9,  fat:0.2,  serving_g:123, unit:'1 medium'},
  {id:206, name:'Cucumber',                      kcal:15,  protein:0.7,  carbs:3.6,  fat:0.1,  serving_g:200, unit:'1 medium'},
  {id:207, name:'Green beans, cooked',           kcal:35,  protein:1.8,  carbs:7.9,  fat:0.1,  serving_g:125, unit:'1 cup'},
  {id:208, name:'Mushrooms, cooked',             kcal:28,  protein:2.2,  carbs:5.8,  fat:0.2,  serving_g:156, unit:'1 cup'},
  {id:209, name:'Onion',                         kcal:40,  protein:1.1,  carbs:9.3,  fat:0.1,  serving_g:110, unit:'1 medium'},
  {id:210, name:'Zucchini, cooked',              kcal:17,  protein:1.2,  carbs:3.5,  fat:0.3,  serving_g:180, unit:'1 cup'},
  {id:211, name:'Asparagus, cooked',             kcal:20,  protein:2.2,  carbs:3.7,  fat:0.2,  serving_g:180, unit:'1 cup'},
  {id:212, name:'Cauliflower, cooked',           kcal:23,  protein:1.8,  carbs:4.9,  fat:0.2,  serving_g:156, unit:'1 cup'},
  {id:213, name:'Romaine lettuce',               kcal:17,  protein:1.2,  carbs:3.3,  fat:0.3,  serving_g:85,  unit:'2 cups shredded'},
  // ─── CONDIMENTS & EXTRAS ─────────────────────────────────────────────────
  {id:220, name:'Mayonnaise',                    kcal:680, protein:1.0,  carbs:0.6,  fat:75.0, serving_g:15,  unit:'1 tbsp'},
  {id:221, name:'Ketchup',                       kcal:100, protein:1.7,  carbs:25.0, fat:0.1,  serving_g:17,  unit:'1 tbsp'},
  {id:222, name:'Honey',                         kcal:304, protein:0.3,  carbs:82.0, fat:0,    serving_g:21,  unit:'1 tbsp'},
  {id:223, name:'Jam or jelly',                  kcal:278, protein:0.4,  carbs:69.0, fat:0.1,  serving_g:20,  unit:'1 tbsp'},
  {id:224, name:'Ranch dressing',                kcal:487, protein:1.3,  carbs:6.4,  fat:51.0, serving_g:30,  unit:'2 tbsp'},
  {id:225, name:'BBQ sauce',                     kcal:172, protein:1.0,  carbs:41.0, fat:0.5,  serving_g:34,  unit:'2 tbsp'},
  {id:226, name:'Soy sauce',                     kcal:53,  protein:8.1,  carbs:4.9,  fat:0.6,  serving_g:18,  unit:'1 tbsp'},
  {id:227, name:'Dark chocolate, 70%',           kcal:598, protein:8.0,  carbs:46.0, fat:43.0, serving_g:28,  unit:'1 oz'},
  {id:228, name:'Granola bar (Nature Valley)',   kcal:380, protein:8.0,  carbs:64.0, fat:12.0, serving_g:44,  unit:'1 bar'},
  {id:229, name:'Pretzels',                      kcal:381, protein:9.0,  carbs:80.0, fat:2.1,  serving_g:28,  unit:'1 oz'},
  {id:230, name:'Tortilla chips',                kcal:489, protein:7.1,  carbs:63.0, fat:23.0, serving_g:28,  unit:'1 oz'},
  {id:231, name:'Popcorn, plain',                kcal:387, protein:13.0, carbs:74.0, fat:5.0,  serving_g:14,  unit:'2 cups'},
  {id:232, name:'Salsa',                         kcal:36,  protein:1.8,  carbs:8.0,  fat:0.2,  serving_g:65,  unit:'1/4 cup'},
  // ─── DRINKS ──────────────────────────────────────────────────────────────
  {id:240, name:'Orange juice',                  kcal:45,  protein:0.7,  carbs:10.0, fat:0.2,  serving_g:248, unit:'1 cup'},
  {id:241, name:'Apple juice',                   kcal:46,  protein:0.1,  carbs:11.0, fat:0.1,  serving_g:248, unit:'1 cup'},
  {id:242, name:'Sports drink (Gatorade)',       kcal:26,  protein:0,    carbs:7.0,  fat:0,    serving_g:591, unit:'20 fl oz bottle'},
  {id:243, name:'Almond milk, unsweetened',      kcal:17,  protein:0.6,  carbs:0.6,  fat:1.5,  serving_g:244, unit:'1 cup'},
  {id:244, name:'Soy milk, unsweetened',         kcal:33,  protein:3.3,  carbs:1.8,  fat:1.8,  serving_g:244, unit:'1 cup'},
  {id:245, name:'Coconut milk, canned full-fat', kcal:230, protein:2.3,  carbs:5.5,  fat:24.0, serving_g:60,  unit:'1/4 cup'},
  {id:246, name:'Ensure Plus shake',             kcal:152, protein:6.3,  carbs:20.0, fat:5.3,  serving_g:237, unit:'1 can (8oz)'},
  // ─── RESTAURANT & FAST FOOD ──────────────────────────────────────────────
  {id:260, name:"McDonald's Big Mac",            kcal:257, protein:13.0, carbs:24.0, fat:13.0, serving_g:212, unit:'1 burger'},
  {id:261, name:"McDonald's McChicken",          kcal:264, protein:15.0, carbs:30.0, fat:10.0, serving_g:150, unit:'1 sandwich'},
  {id:262, name:"McDonald's Chicken McNuggets",  kcal:228, protein:15.0, carbs:14.0, fat:13.0, serving_g:162, unit:'10 pieces'},
  {id:263, name:"McDonald's Large Fries",        kcal:290, protein:3.5,  carbs:39.0, fat:14.0, serving_g:170, unit:'1 large'},
  {id:264, name:"Subway 6\" Turkey Breast",      kcal:280, protein:18.0, carbs:40.0, fat:4.5,  serving_g:220, unit:'6-inch sub'},
  {id:265, name:"Subway 6\" Chicken Breast",     kcal:320, protein:24.0, carbs:40.0, fat:5.0,  serving_g:245, unit:'6-inch sub'},
  {id:266, name:'Chipotle chicken burrito bowl', kcal:665, protein:51.0, carbs:68.0, fat:18.0, serving_g:450, unit:'1 bowl'},
  {id:267, name:'Pizza, cheese slice',           kcal:272, protein:12.0, carbs:34.0, fat:10.0, serving_g:107, unit:'1 slice'},
  {id:268, name:'Pizza, pepperoni slice',        kcal:298, protein:13.0, carbs:34.0, fat:12.0, serving_g:107, unit:'1 slice'},
  {id:269, name:'Chicken rice bowl (takeout)',   kcal:150, protein:13.0, carbs:19.0, fat:2.5,  serving_g:300, unit:'1 bowl (~300g)'},
  {id:270, name:'Burrito, bean and cheese',      kcal:204, protein:9.0,  carbs:29.0, fat:6.7,  serving_g:170, unit:'1 burrito'},
  {id:271, name:'Cheeseburger, fast food',       kcal:313, protein:19.0, carbs:28.0, fat:14.0, serving_g:120, unit:'1 burger'},
  {id:272, name:'Chicken sandwich, grilled',     kcal:283, protein:28.0, carbs:28.0, fat:7.6,  serving_g:143, unit:'1 sandwich'},
  {id:273, name:'Doner kebab (meat + pita)',     kcal:215, protein:15.0, carbs:18.0, fat:9.0,  serving_g:250, unit:'1 serving'},
];

// ─── IndexedDB Wrapper ────────────────────────────────────────────────────────
var FoodDB = (function () {
  var DB_NAME = 'rg_food_db';
  var DB_VERSION = 1;
  var _db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var idb = e.target.result;
        if (!idb.objectStoreNames.contains('foods')) {
          var store = idb.createObjectStore('foods', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          FOODS.forEach(function (f) { store.add(f); });
        }
        if (!idb.objectStoreNames.contains('custom')) {
          idb.createObjectStore('custom', { keyPath: 'id', autoIncrement: true });
        }
        if (!idb.objectStoreNames.contains('recipes')) {
          idb.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function _cursor(storeName, cb) {
    return new Promise(function (resolve) {
      var results = [];
      var tx = _db.transaction(storeName, 'readonly');
      tx.objectStore(storeName).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) { var r = cb(cursor.value); if (r) results.push(r); cursor.continue(); }
        else resolve(results);
      };
    });
  }

  function search(query) {
    var q = (query || '').toLowerCase().trim();
    if (!q) return Promise.resolve([]);
    return Promise.all([
      _cursor('foods',  function (v) { return v.name.toLowerCase().includes(q) ? Object.assign({}, v, {_type:'db'})     : null; }),
      _cursor('custom', function (v) { return v.name.toLowerCase().includes(q) ? Object.assign({}, v, {_type:'custom'}) : null; }),
    ]).then(function (pairs) {
      return pairs[0].concat(pairs[1]).sort(function (a, b) {
        return a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q);
      }).slice(0, 25);
    });
  }

  function addCustom(food) {
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction('custom', 'readwrite');
      var req = tx.objectStore('custom').add(food);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function updateCustom(food) {
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction('custom', 'readwrite');
      var req = tx.objectStore('custom').put(food);
      req.onsuccess = function () { resolve(); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function deleteCustom(id) {
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction('custom', 'readwrite');
      var req = tx.objectStore('custom').delete(Number(id));
      req.onsuccess = function () { resolve(); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function getAllCustom() {
    return _cursor('custom', function (v) { return v; });
  }

  function addRecipe(recipe) {
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction('recipes', 'readwrite');
      var req = tx.objectStore('recipes').add(recipe);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function getAllRecipes() {
    return _cursor('recipes', function (v) { return v; });
  }

  function deleteRecipe(id) {
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction('recipes', 'readwrite');
      var req = tx.objectStore('recipes').delete(Number(id));
      req.onsuccess = function () { resolve(); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function getCustomById(id) {
    return new Promise(function (resolve) {
      var tx = _db.transaction('custom', 'readonly');
      var req = tx.objectStore('custom').get(Number(id));
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror   = function () { resolve(null); };
    });
  }

  function exportAll() {
    return Promise.all([getAllCustom(), getAllRecipes()]).then(function (r) {
      return { custom: r[0], recipes: r[1] };
    });
  }

  function importAll(data) {
    var custom  = (data && data.custom)  || [];
    var recipes = (data && data.recipes) || [];
    return new Promise(function (resolve) {
      var tx = _db.transaction(['custom','recipes'], 'readwrite');
      var cs = tx.objectStore('custom');
      var rs = tx.objectStore('recipes');
      cs.clear(); rs.clear();
      custom.forEach(function (f)  { var copy = Object.assign({}, f); delete copy.id; cs.add(copy); });
      recipes.forEach(function (r) { var copy = Object.assign({}, r); delete copy.id; rs.add(copy); });
      tx.oncomplete = function () { resolve(); };
    });
  }

  return { open:open, search:search, addCustom:addCustom, updateCustom:updateCustom, deleteCustom:deleteCustom, getAllCustom:getAllCustom, addRecipe:addRecipe, getAllRecipes:getAllRecipes, deleteRecipe:deleteRecipe, getCustomById:getCustomById, exportAll:exportAll, importAll:importAll };
})();
