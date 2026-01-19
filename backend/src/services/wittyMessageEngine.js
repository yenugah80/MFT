/**
 * ============================================================================
 * WITTY MESSAGE ENGINE
 * ============================================================================
 *
 * Zomato-inspired messaging system that makes notifications delightful.
 *
 * THE 8 PRINCIPLES (from Zomato's playbook):
 * 1. PERSONALIZATION - Use context, not just names
 * 2. EMOTIONAL APPEAL - Make them smile, not just inform
 * 3. RELATABILITY - Tap into shared wellness struggles
 * 4. CURIOSITY - Create intrigue that demands a tap
 * 5. TREND-AWARE - Reference current moments when relevant
 * 6. TIMING - Right message at the right moment
 * 7. EMOJI GAME - Emojis that add meaning, not decoration
 * 8. LOCALIZATION - Speak their language, literally and culturally
 *
 * CORE RULE: Never send a message you'd ignore yourself.
 */

// ============================================================================
// WELLNESS DOMAINS
// ============================================================================

const DOMAINS = {
  FOOD: 'food',
  HYDRATION: 'hydration',
  MOOD: 'mood',
  ACTIVITY: 'activity',
};

// ============================================================================
// HYDRATION MESSAGES - The star of the show (EXPANDED)
// ============================================================================

const HYDRATION_MESSAGES = {
  // NO LOGS TODAY (by time of day) - EXPANDED
  noLogsToday: {
    morning: [
      { title: "Your cells called", body: "They're still waiting for their morning hydration. Just saying. 💧" },
      { title: "Plot twist", body: "Your body is 60% water and 100% waiting for you to log some." },
      { title: "Day started, water hasn't", body: "Your first glass kickstarts everything. Ready when you are." },
      { title: "Morning dehydration hits different", body: "8 hours without water while sleeping. Your body is parched." },
      { title: "Coffee first? Water first is the real power move", body: "Your cells will thank you." },
      { title: "Rise and hydrate", body: "The morning routine that actually matters." },
      { title: "Your body just woke up too", body: "It's wondering when the water arrives." },
      { title: "Zero glasses so far today", body: "We're not judging. We're just... observing. 👀" },
      { title: "Good morning!", body: "Your first sip starts the best kind of streak." },
      { title: "The early water gets the... energy?", body: "That's how the saying goes, right?" },
    ],
    afternoon: [
      { title: "Afternoon check", body: "Your water bottle is feeling neglected. We can tell." },
      { title: "Just curious", body: "Did you forget water exists? Genuine question. 💧" },
      { title: "Your hydration: 📉", body: "Your energy later: also 📉. Coincidence? Nope." },
      { title: "It's past noon and still no water?", body: "Bold strategy. Let's see if it pays off." },
      { title: "Afternoon slump loading...", body: "Water now = avoiding that 3pm crash." },
      { title: "Quick poll", body: "When's the last time you had water? Don't worry, we'll wait." },
      { title: "Your afternoon energy forecast", body: "Cloudy with a chance of dehydration fatigue." },
      { title: "Hydration gap detected", body: "The afternoon is not the time for this gap." },
      { title: "Remember water?", body: "The clear stuff that makes everything work better?" },
      { title: "Productivity tip #47", body: "Drink water. That's it. That's the tip." },
    ],
    evening: [
      { title: "Evening confession time", body: "How much water today? Zero counts as an answer. 😅" },
      { title: "Hot take", body: "A day without water logging is a day lived on hard mode." },
      { title: "End of day reality check", body: "Your hydration score is... well, there isn't one." },
      { title: "It's not too late", body: "A few glasses now and you can salvage this." },
      { title: "The sun's going down", body: "And so is your chance to hit your water goal today." },
      { title: "Evening hydration rescue mission", body: "Accepting applications now." },
      { title: "Today's water count: 0", body: "Tomorrow can be different. We believe in you." },
      { title: "Plot twist opportunity", body: "What if today became a hydration day after all?" },
    ],
  },

  // BEHIND PACE - EXPANDED
  behindPace: [
    { title: "{hours}h since your last sip", body: "Your future self would appreciate a glass right now." },
    { title: "Time flies when you're... dehydrated?", body: "{hours} hours without water. Your kidneys have questions." },
    { title: "Quick math", body: "{remaining}ml left ÷ {hoursLeft}h remaining = time to drink up." },
    { title: "Your hydration graph", body: "📈 could be you. 📉 is currently you. Fix it?" },
    { title: "Been a while", body: "{hours} hours is longer than you think without water." },
    { title: "Your body's request queue", body: "Water has been pending for {hours} hours." },
    { title: "The clock is ticking", body: "{hoursLeft} hours left to hit {remaining}ml. Totally doable." },
    { title: "Hydration math", body: "You need {remaining}ml. You have {hoursLeft}h. Go." },
    { title: "Time check", body: "Last water log: {hours}h ago. That's... a lot of h's." },
    { title: "Falling behind", body: "But catching up is just one big glass away." },
    { title: "Your water bottle is judging you", body: "It's been {hours} hours. It has every right." },
    { title: "The gap is growing", body: "{hours}h without water. Your cells are writing complaint letters." },
  ],

  // ALMOST THERE (75-99%) - EXPANDED
  almostThere: [
    { title: "So. Close.", body: "Just {remaining}ml between you and hydration glory. 💧" },
    { title: "The home stretch", body: "{remaining}ml more and you're officially a hydration champion." },
    { title: "Almost there!", body: "Your body is {percentage}% impressed. Get to 100%." },
    { title: "One glass away", body: "From being the person who hit their water goal. Be that person." },
    { title: "Can you taste victory?", body: "It tastes like {remaining}ml of water." },
    { title: "{percentage}% and climbing", body: "Don't stop now. The finish line is RIGHT THERE." },
    { title: "Plot twist incoming", body: "The protagonist (you) is about to win at hydration." },
    { title: "Your cells are holding their breath", body: "Finish what you started. {remaining}ml to go." },
    { title: "This close 🤏", body: "{remaining}ml. That's basically nothing. You got this." },
    { title: "Victory lap loading", body: "Just {remaining}ml between you and celebration." },
    { title: "The countdown begins", body: "{remaining}ml. Then glory. Then bragging rights." },
    { title: "You're in the 75th percentile", body: "Of your own hydration goal. Finish strong." },
  ],

  // GOAL ACHIEVED - EXPANDED
  goalAchieved: [
    { title: "You absolute legend", body: "Water goal: demolished. Your cells are throwing a party. 🎉" },
    { title: "Goal crushed 💪", body: "Your future self just high-fived your present self." },
    { title: "Hydration complete", body: "You're basically a well-watered houseplant now. Beautiful." },
    { title: "100% hydrated", body: "Your body is running on premium fuel today. Well done." },
    { title: "Mission accomplished", body: "Your kidneys would buy you a thank you card if they could." },
    { title: "Flawless execution", body: "Water goal: set. Water goal: hit. You: amazing." },
    { title: "Peak performance unlocked", body: "This is what hydration victory feels like." },
    { title: "You did that", body: "Your water goal didn't stand a chance today." },
    { title: "Hydration hero status", body: "Officially earned. Wear it proudly." },
    { title: "Today's winner: you", body: "Runner-up: your extremely hydrated body." },
    { title: "The goal has been obliterated", body: "In the best way possible. 🎯" },
    { title: "Achievement unlocked: Hydration Master", body: "The rarest achievement. You earned it." },
    { title: "Your body right now", body: "Running smoother than a mountain stream. Nice." },
    { title: "Water goal? Don't know her", body: "Because you already destroyed it." },
  ],

  // GOAL ACHIEVED WITH STREAK - EXPANDED
  goalWithStreak: [
    { title: "{streak} days of hydration excellence", body: "At this point, you're not building a streak. You're building a lifestyle. 🔥" },
    { title: "{streak}-day streak!", body: "Consistency > motivation. You've got both." },
    { title: "Streak alert: {streak} days", body: "Your water bottle is your most reliable relationship rn." },
    { title: "Day {streak} of being a hydration icon", body: "Your cells don't even remember dehydration." },
    { title: "{streak} days and counting", body: "The streak is you. You are the streak." },
    { title: "Water goal + streak = today", body: "Day {streak} of you being absolutely unstoppable." },
    { title: "Streak status: legendary ({streak} days)", body: "This is what discipline looks like in action." },
    { title: "{streak}-day streak, still thriving", body: "Your consistency is actually inspiring." },
    { title: "Another day, another hydration W", body: "That's {streak} W's in a row now." },
    { title: "The streak lives!", body: "Day {streak}. Your future self is so proud of present you." },
  ],

  // WEATHER AWARE (requires weather context) - EXPANDED
  weatherAware: {
    hot: [
      { title: "It's {temp}° outside", body: "Your body is losing water just reading this. Drink up. 🥵" },
      { title: "Heat check", body: "The sun is working hard. Your hydration should too." },
      { title: "Hot day advisory", body: "{temp}° means your water needs just doubled." },
      { title: "Sweating yet?", body: "At {temp}°, you probably are. Replace that water." },
      { title: "Weather forecast: drink more water", body: "{temp}° = no excuses for dehydration." },
      { title: "The sun has spoken", body: "At {temp}°, it's demanding you hydrate." },
    ],
    cold: [
      { title: "Cold weather hack", body: "You still need water even when it's freezing. Wild, right?" },
      { title: "Winter hydration", body: "Dry air = sneaky dehydration. Don't let it win." },
      { title: "Plot twist", body: "Cold weather dehydrates you almost as much as hot. Stay vigilant." },
      { title: "The heater is on", body: "Which means the air is dry. Which means: drink water." },
      { title: "Winter hydration reminder", body: "You don't feel thirsty in cold weather. Drink anyway." },
    ],
    humid: [
      { title: "Humidity is deceiving", body: "You're still losing water even if you feel wet. Drink up." },
      { title: "Sweating without trying", body: "Humidity does that. Water is the counter-move." },
    ],
  },

  // CAFFEINE CONTEXT - EXPANDED
  caffeineAware: [
    { title: "Coffee logged ☕", body: "Pro tip: follow up with water. Caffeine is a sneaky dehydrator." },
    { title: "Caffeine detected", body: "For every coffee, your body wants 1.5x water. Just the facts." },
    { title: "Coffee break?", body: "Make it a coffee + water break. Your body will thank you." },
    { title: "The coffee-water ratio", body: "1 coffee : 1.5 glasses of water. That's the formula." },
    { title: "Caffeine entered the chat", body: "Water needs to enter next. Balance is key." },
    { title: "Energy drink detected", body: "Pair it with water or your energy will crash harder later." },
    { title: "Tea counts too", body: "But it's still mild caffeine. A water chaser helps." },
  ],

  // TIME-SPECIFIC NUDGES - EXPANDED
  timeSpecific: {
    preMeal: [
      { title: "Meal incoming?", body: "A glass of water before eating = better digestion. Science." },
      { title: "Pre-meal pro tip", body: "Water 30 mins before food helps everything work better." },
      { title: "Eating soon?", body: "Water first. It's like a warm-up for your stomach." },
    ],
    postWorkout: [
      { title: "Just worked out?", body: "Your muscles are 75% water and 100% thirsty right now." },
      { title: "Post-workout hydration", body: "You just lost water through sweat. Time to refill." },
      { title: "Workout complete", body: "Now hydrate like your recovery depends on it. Because it does." },
    ],
    beforeBed: [
      { title: "Night mode activated", body: "Small sip before bed. Not enough to wake you up, enough to help." },
      { title: "Pre-sleep hydration", body: "A small glass now means better sleep later." },
      { title: "Last call for water", body: "Your body has 8 hours of no water ahead. Prep it." },
    ],
    wakeUp: [
      { title: "Morning hydration window", body: "Your first 30 mins are prime hydration time. Seize them." },
      { title: "Good morning, dehydrated human", body: "8 hours without water. Your body has requests." },
      { title: "Rise and hydrate", body: "Water before coffee is the real morning hack." },
    ],
    midMorning: [
      { title: "10am check-in", body: "Are you on track? A quick log keeps momentum." },
      { title: "Mid-morning momentum", body: "Perfect time to top up your hydration." },
    ],
    afternoon: [
      { title: "Post-lunch slump prevention", body: "Water helps. Coffee helps more. Both help most." },
      { title: "Afternoon energy hack", body: "Feeling tired? Water first, then decide if you need coffee." },
    ],
  },
};

// ============================================================================
// FOOD/MEAL MESSAGES - EXPANDED
// ============================================================================

const FOOD_MESSAGES = {
  // NO MEALS LOGGED - EXPANDED
  noMealsToday: {
    breakfast: [
      { title: "Breakfast happened, right?", body: "Log it before your brain forgets. Takes 10 seconds." },
      { title: "Morning fuel check", body: "What powered your morning? We're genuinely curious." },
      { title: "That breakfast isn't going to remember itself", body: "Quick log before life gets busy." },
      { title: "Most important meal, allegedly", body: "Whether you believe that or not, log what you ate." },
      { title: "Morning nourishment: logged?", body: "Even coffee + nothing is a data point. Be honest." },
      { title: "Breakfast vibes", body: "Big breakfast? Skipped it? Either way, we want to know." },
      { title: "The breakfast files", body: "Case opened. Evidence (your meal) needed." },
      { title: "Your morning fuel", body: "Whether it was granola or leftover pizza. No judgment." },
    ],
    lunch: [
      { title: "Lunch break?", body: "Your nutrition insights are only as good as your logs. No pressure." },
      { title: "Midday check-in", body: "Whatever you ate, we'd love to know. For science." },
      { title: "That lunch was probably good", body: "Share with the app? Purely for tracking purposes 😏" },
      { title: "Noon report", body: "What refueled you for the afternoon? Quick log." },
      { title: "Lunch: eaten. Log: pending.", body: "Complete the sequence." },
      { title: "Midday mystery", body: "What did you eat? The algorithm is curious." },
      { title: "Afternoon energy source", body: "Log it so we can predict your 3pm vibe." },
      { title: "The lunch question", body: "Salad? Sandwich? Pizza? All valid. All trackable." },
    ],
    dinner: [
      { title: "Dinner time!", body: "End the day with a log. Your streak depends on it." },
      { title: "Evening meal?", body: "One quick log and your day is complete. Promise it's fast." },
      { title: "Day's almost done", body: "Lock in that dinner before your streak ghosts you. 👻" },
      { title: "Final meal of the day", body: "Log it and call it a nutrition win." },
      { title: "Dinner data needed", body: "Your insights are waiting for this last piece." },
      { title: "Evening fuel", body: "What's fueling your Netflix session? Log it." },
      { title: "Before the day ends", body: "One more log. You've got this." },
      { title: "The last log standing", body: "Dinner. The one that completes your day." },
    ],
    snack: [
      { title: "Snack attack?", body: "Those count too. Every bite builds your nutrition story." },
      { title: "Between-meal bite", body: "Snacks are data points too. Quick log?" },
      { title: "The in-between foods", body: "Snacks tell us about your patterns. Log them!" },
    ],
  },

  // STREAK PROTECTION - EXPANDED
  streakProtection: [
    { title: "{streak}-day streak on the line", body: "One meal log is all that stands between you and heartbreak. 💔" },
    { title: "Streak SOS: {streak} days", body: "You didn't come this far to only come this far. Log something." },
    { title: "Your {streak}-day streak is getting nervous", body: "It's seen this movie before. Make it a happy ending." },
    { title: "{streak} days of work", body: "Don't let it slip away. One log saves everything." },
    { title: "Streak emergency: {streak} days at risk", body: "You know what to do. We believe in you." },
    { title: "The streak is watching", body: "{streak} days of consistency. Don't break its heart." },
    { title: "This streak is EARNED", body: "{streak} days doesn't happen by accident. Protect it." },
    { title: "Plot twist available", body: "The {streak}-day streak that almost ended... but didn't." },
  ],

  // MEAL LOGGED SUCCESS - EXPANDED
  mealLogged: [
    { title: "Logged ✓", body: "Your future insights just got a little smarter." },
    { title: "Data point acquired", body: "Every log teaches us more about what works for you." },
    { title: "Nice one", body: "That's {mealsToday} meal(s) logged today. Keep it going." },
    { title: "Meal in the books", body: "Your nutrition story just added another chapter." },
    { title: "Got it!", body: "Your meal is now part of your pattern analysis." },
    { title: "Nutrition intel captured", body: "This data helps us help you. Thanks!" },
    { title: "Another log, another insight", body: "Consistency is how patterns emerge." },
    { title: "Meal recorded", body: "Your body thanks you. Your app thanks you more." },
  ],

  // CALORIE AWARENESS - EXPANDED
  calorieAwareness: {
    roomForMore: [
      { title: "Room for a snack?", body: "{remaining} calories left in your budget. Treat yourself?" },
      { title: "Calorie check", body: "You've got {remaining} left today. Plenty of runway." },
      { title: "Space in the budget", body: "{remaining} calories. Dessert is technically justified." },
      { title: "Calorie buffer active", body: "{remaining} remaining. Use wisely. Or indulgently." },
    ],
    atGoal: [
      { title: "Calorie goal: hit", body: "You ate exactly what you planned. That's rare and impressive." },
      { title: "Precision nutrition", body: "Hitting your calorie goal is harder than it looks. Well done." },
      { title: "The perfect day", body: "Calorie goal: achieved. Self-control: demonstrated." },
    ],
    overGoal: [
      { title: "Over budget today", body: "It happens. Tomorrow's a reset. No judgment here." },
      { title: "Calorie surplus noted", body: "One day doesn't define you. Move on gracefully." },
      { title: "Today was... generous", body: "Calorically speaking. Tomorrow's a fresh start." },
    ],
    underGoal: [
      { title: "Running a deficit", body: "Make sure it's intentional. Fuel is important." },
      { title: "Room for more fuel", body: "If you're hungry, eat. The numbers allow it." },
    ],
  },

  // ENERGY PREDICTION - EXPANDED
  energyPrediction: {
    crash: [
      { title: "3pm energy dip incoming?", body: "That high-sugar lunch might hit you soon. Snack prep?" },
      { title: "Energy forecast: cloudy", body: "Low protein + high carbs = afternoon slump. Heads up." },
      { title: "Sugar spike detected", body: "The crash is about 2 hours away. Prep accordingly." },
      { title: "Energy alert", body: "That meal might cause a dip later. Just a heads up." },
      { title: "Crash course incoming", body: "High sugar + low protein = predictable afternoon slump." },
    ],
    boost: [
      { title: "Energy forecast: sunny", body: "That balanced meal should keep you going. Nice choice." },
      { title: "Stable energy ahead", body: "Good protein, good carbs. You'll feel this for hours." },
      { title: "Quality fuel detected", body: "Your afternoon is set up for success." },
      { title: "Peak nutrition", body: "This meal is working FOR you, not against you." },
    ],
  },

  // MACRO BALANCE - NEW
  macroBalance: {
    highProtein: [
      { title: "Protein power", body: "That meal is basically a muscle-building session. 💪" },
      { title: "Protein alert", body: "Your muscles just got very excited." },
    ],
    lowProtein: [
      { title: "Protein gap", body: "This meal could use more protein for sustained energy." },
      { title: "Quick tip", body: "Add some protein to your next meal for balance." },
    ],
    highCarb: [
      { title: "Carb-loaded", body: "Great for energy. Better if paired with protein." },
    ],
    balanced: [
      { title: "Balanced meal achieved", body: "Protein, carbs, fats in harmony. Chef's kiss. 👨‍🍳" },
      { title: "Nutrition goals", body: "This is what a well-rounded meal looks like." },
    ],
  },

  // MEAL TIMING - NEW
  mealTiming: {
    lateMeal: [
      { title: "Late night fuel", body: "Eating late can affect sleep. Just something to think about." },
      { title: "Night owl dining", body: "Your body takes longer to digest late meals. FYI." },
    ],
    perfectTiming: [
      { title: "Meal timing on point", body: "Eating at the right time helps metabolism. Nice." },
    ],
    mealGap: [
      { title: "Long gap detected", body: "It's been {hours}h since you ate. Hungry?" },
      { title: "Meal gap alert", body: "{hours} hours without food. Your blood sugar might be dipping." },
    ],
  },
};

// ============================================================================
// MOOD MESSAGES
// ============================================================================

const MOOD_MESSAGES = {
  // MOOD CHECK-IN PROMPTS
  checkIn: {
    evening: [
      { title: "Quick vibe check 🌤️", body: "How's today treating you? 5 seconds to log, days of insights." },
      { title: "End of day feels", body: "Rate your day. It helps us connect the dots." },
      { title: "Mood moment", body: "Before you wind down, how would you rate today?" },
    ],
    afternoon: [
      { title: "Afternoon pulse", body: "How's the day going? Quick check-in helps pattern detection." },
    ],
  },

  // PATTERN DETECTED
  patternDetected: [
    { title: "We noticed something", body: "Your mood tends to {pattern}. Interesting, right?" },
    { title: "Pattern alert 🔍", body: "{pattern} - this keeps happening. Worth paying attention to." },
  ],

  // MOOD LOGGED
  moodLogged: {
    positive: [
      { title: "Good day logged ✨", body: "We're tracking what makes these happen. More insights coming." },
      { title: "Noted: you're thriving", body: "Let's figure out what contributed to this." },
    ],
    negative: [
      { title: "Tough day noted", body: "This data helps us help you. Tomorrow's a new one." },
      { title: "We see you", body: "Some days are harder. We're tracking patterns to help." },
    ],
    neutral: [
      { title: "Middle of the road", body: "Not every day is a highlight reel. That's okay." },
    ],
  },

  // STRESS AWARENESS
  stressAware: [
    { title: "Stress check", body: "High stress → low energy. The math checks out. How are you?" },
    { title: "Stress level: logged", body: "We're connecting stress to your other patterns. Stay tuned." },
  ],
};

// ============================================================================
// ACTIVITY MESSAGES
// ============================================================================

const ACTIVITY_MESSAGES = {
  // STEP GOAL
  stepGoal: {
    achieved: [
      { title: "Step goal: crushed 👟", body: "{steps} steps. Your legs did the work, you get the glory." },
      { title: "{steps} steps today", body: "That's roughly {distance}. You walked that. Be proud." },
    ],
    almostThere: [
      { title: "So close to your step goal", body: "Just {remaining} more. A quick walk around the block?" },
      { title: "{percentage}% of step goal", body: "{remaining} left. You got this." },
    ],
    behindPace: [
      { title: "Movement break?", body: "You're at {steps} steps. A walk now could change your day." },
      { title: "Sitting for a while?", body: "Your body is designed to move. Even 5 mins helps." },
    ],
  },

  // POST-WORKOUT
  postWorkout: [
    { title: "Workout logged 💪", body: "Recovery starts now. Hydrate and refuel." },
    { title: "You showed up", body: "That's more than most. Your body will thank you." },
    { title: "Activity recorded", body: "We're tracking how this affects your energy and mood." },
  ],

  // RECOVERY
  recovery: [
    { title: "Rest day reminder", body: "Recovery is where gains happen. Don't skip it." },
    { title: "Your muscles are rebuilding", body: "Yesterday was intense. Today is for recovery." },
  ],

  // SEDENTARY NUDGE
  sedentaryNudge: [
    { title: "You've been still for a bit", body: "Not judging, just observing. A stretch might feel good." },
    { title: "Movement opportunity", body: "Even standing up and stretching counts. Your spine will thank you." },
  ],
};

// ============================================================================
// STREAK MESSAGES (Every day deserves celebration) - COMPREHENSIVE
// ============================================================================

const STREAK_MESSAGES = {
  // === DAYS 1-7: THE FOUNDATION WEEK ===
  1: [
    { title: "Day 1 ✓", body: "Every streak starts here. You've begun. That's the hardest part." },
    { title: "First day in the books", body: "The journey of 100 days starts with day 1. ✓" },
    { title: "Genesis", body: "Day 1 of something great. You'll remember this." },
  ],
  2: [
    { title: "Day 2 🌱", body: "Back-to-back. This is how habits are born." },
    { title: "Two days running", body: "Once is an event. Twice is the start of a pattern." },
    { title: "The sequel", body: "Day 2 is where most stop. You didn't." },
  ],
  3: [
    { title: "Day 3! 📈", body: "Three days = you're taking this seriously." },
    { title: "Hat trick", body: "3 days straight. Momentum is on your side." },
    { title: "The trilogy", body: "Day 3. The story is getting good." },
  ],
  4: [
    { title: "Day 4 💪", body: "Most people quit by now. You're not most people." },
    { title: "Four-day streak", body: "You're in the top 20% who make it this far. Fact." },
    { title: "Past the hump", body: "Day 4. The hardest days are behind you." },
  ],
  5: [
    { title: "Day 5! 🌟", body: "Halfway to a week. The finish line is in sight." },
    { title: "Business week complete", body: "5 days down. Weekend won't break your streak, right?" },
    { title: "Five alive", body: "Day 5. The habit is starting to feel natural." },
  ],
  6: [
    { title: "Day 6 🔥", body: "Tomorrow makes a week. You know what to do." },
    { title: "Six-day streak", body: "One more day and you've done what 95% don't." },
    { title: "The eve of a milestone", body: "Day 6. Tomorrow you celebrate." },
  ],
  7: [
    { title: "ONE WEEK 🎉", body: "7 days. A full week. You've built something real." },
    { title: "Week one: complete", body: "7 days of showing up. This is who you are now." },
    { title: "The first milestone", body: "A full week. This is just the beginning." },
  ],

  // === DAYS 8-13: WEEK 2 BUILD-UP ===
  8: [
    { title: "Day 8 🚀", body: "Into week 2. The habit is strengthening." },
    { title: "Beyond a week", body: "Day 8. You're building something sustainable." },
  ],
  9: [
    { title: "Day 9 💫", body: "Single digits ending soon. Double digits await." },
    { title: "Almost double digits", body: "Day 9. Tomorrow is a milestone." },
  ],
  10: [
    { title: "DOUBLE DIGITS 🔟", body: "10 days! The first major milestone after a week." },
    { title: "Day 10! 🎯", body: "10 days of consistency. That's 240 hours of commitment." },
  ],
  11: [
    { title: "Day 11 ⭐", body: "11 days. You're in rare territory now." },
    { title: "Eleven strong", body: "Most streaks don't make it here. Yours did." },
  ],
  12: [
    { title: "Day 12 📊", body: "Almost 2 weeks. The data is getting interesting." },
    { title: "A dozen days", body: "12 days of you being your best self." },
  ],
  13: [
    { title: "Day 13 🍀", body: "Lucky 13. Tomorrow marks 2 weeks." },
    { title: "Unlucky? Not you", body: "Day 13. Tomorrow is your victory lap." },
  ],
  14: [
    { title: "TWO WEEKS 💪", body: "14 days. The habit is forming. You can feel it." },
    { title: "Fortnight of consistency", body: "Two weeks of you being reliable to yourself." },
    { title: "2 weeks down", body: "14 days. This is starting to feel permanent." },
  ],

  // === DAYS 15-20: APPROACHING 3 WEEKS ===
  15: [
    { title: "Day 15 🌟", body: "Halfway to a month. Keep this pace." },
    { title: "15-day streak", body: "You're more than 2 weeks in. Impressive." },
  ],
  16: [
    { title: "Day 16 💎", body: "16 days of dedication. Your future self is grateful." },
    { title: "Sweet sixteen", body: "16 days of consistency deserves recognition." },
  ],
  17: [
    { title: "Day 17 🎯", body: "Over halfway to 30. The goal is in sight." },
    { title: "17 and thriving", body: "Most people didn't make it this far. You did." },
  ],
  18: [
    { title: "Day 18 🔥", body: "18 days. You're almost at 3 weeks." },
    { title: "18-day streak", body: "The consistency is becoming automatic." },
  ],
  19: [
    { title: "Day 19 ⚡", body: "One more day to 20. Push through." },
    { title: "Nineteen strong", body: "Tomorrow is day 20. Keep going." },
  ],
  20: [
    { title: "TWENTY DAYS 🎊", body: "20 days. This is real commitment." },
    { title: "Day 20! 🏅", body: "2/3 of the way to a month. You're unstoppable." },
  ],
  21: [
    { title: "21 DAYS 🧠", body: "They say 21 days makes a habit. You've done it." },
    { title: "Three weeks", body: "This isn't discipline anymore. It's just who you are." },
    { title: "The magic number", body: "21 days. Science says this is when habits form." },
  ],

  // === DAYS 22-29: APPROACHING ONE MONTH ===
  22: [
    { title: "Day 22 🌈", body: "Past 21. Now you're reinforcing the habit." },
    { title: "22 days strong", body: "The habit is formed. Now you're cementing it." },
  ],
  23: [
    { title: "Day 23 💫", body: "One week until a full month. You've got this." },
    { title: "Almost a month", body: "23 days in. The finish line is near." },
  ],
  24: [
    { title: "Day 24 🚀", body: "6 days to a month. The countdown begins." },
    { title: "24-day streak", body: "You're in elite territory now." },
  ],
  25: [
    { title: "Day 25 ⭐", body: "A quarter of 100 days. Major milestone." },
    { title: "Quarter century", body: "25 days of showing up. That's dedication." },
  ],
  26: [
    { title: "Day 26 🎯", body: "4 days to a month. You can taste it." },
    { title: "26 and counting", body: "Almost there. Don't stop now." },
  ],
  27: [
    { title: "Day 27 💪", body: "3 days left. A month is within reach." },
    { title: "27 days", body: "You've come too far to quit now." },
  ],
  28: [
    { title: "Day 28 🔥", body: "A full lunar cycle! 2 days to a month." },
    { title: "4 weeks complete", body: "28 days. You've been consistent for 4 weeks." },
  ],
  29: [
    { title: "Day 29 ✨", body: "Tomorrow is day 30. Sleep well, champion." },
    { title: "The eve of 30", body: "One more day and you hit a major milestone." },
  ],
  30: [
    { title: "ONE MONTH 🏆", body: "30 days. You're in the top 1% of app users. No exaggeration." },
    { title: "30-day streak!", body: "A full month. This is elite-level consistency." },
    { title: "30 DAYS 🎉", body: "A full month of dedication. You're a legend." },
  ],

  // === DAYS 31-49: BEYOND A MONTH ===
  35: [
    { title: "35 DAYS 🌟", body: "5 weeks! You're making this look easy." },
    { title: "35-day streak", body: "More than a month. This is lifestyle territory." },
  ],
  40: [
    { title: "40 DAYS 💎", body: "40 days of consistency. Biblical, almost." },
    { title: "Day 40!", body: "Some people can't do 40 hours. You did 40 days." },
  ],
  45: [
    { title: "45 DAYS ⚡", body: "Halfway to 90 days. The ultimate goal." },
    { title: "6 weeks+", body: "45 days. You're rewriting your habits." },
  ],
  50: [
    { title: "FIFTY DAYS 👑", body: "50 days. At this point, you're teaching us." },
    { title: "Half a hundred", body: "50 days of consistency. You're built different." },
    { title: "50 DAYS! 🎊", body: "The halfway point to 100. What a journey." },
  ],

  // === DAYS 51-99: THE LONG GAME ===
  60: [
    { title: "60 DAYS 🔥", body: "Two full months. This is extraordinary." },
    { title: "Day 60!", body: "60 days. You've changed as a person." },
  ],
  66: [
    { title: "66 DAYS 🧠", body: "Research says 66 days for automatic habits. You're there." },
    { title: "The science milestone", body: "66 days is when habits become unconscious. Congrats." },
  ],
  75: [
    { title: "75 DAYS 💪", body: "Three-quarters to 100. The end is in sight." },
    { title: "Day 75!", body: "75 days. You've proven you can do anything." },
  ],
  90: [
    { title: "90 DAYS 🏆", body: "3 MONTHS. A full quarter of a year. Legendary." },
    { title: "THREE MONTHS!", body: "90 days. This is transformation territory." },
  ],
  99: [
    { title: "Day 99 ✨", body: "Tomorrow is day 100. Sleep well, legend." },
    { title: "The eve of 100", body: "One more day. One hundred awaits." },
  ],
  100: [
    { title: "💯 DAYS", body: "One hundred days. This deserves a frame on your wall." },
    { title: "The 100 club", body: "You've done what less than 0.1% ever do. Legend status." },
    { title: "CENTURY COMPLETE 🏆", body: "100 days. You are the streak. The streak is you." },
  ],

  // === BEYOND 100 ===
  120: [
    { title: "120 DAYS 👑", body: "4 months. At this point, you're a case study." },
  ],
  150: [
    { title: "150 DAYS 🌟", body: "5 months. You've redefined what's possible." },
  ],
  180: [
    { title: "HALF A YEAR 🎊", body: "180 days. 6 months of showing up. Unbelievable." },
  ],
  200: [
    { title: "200 DAYS 💎", body: "Two hundred days. We're genuinely in awe." },
  ],
  250: [
    { title: "250 DAYS ⚡", body: "8+ months. You've mastered consistency." },
  ],
  300: [
    { title: "300 DAYS 🔥", body: "Almost a year. This is life-changing." },
  ],
  365: [
    { title: "ONE FULL YEAR 🎉", body: "365 days. You've done what seemed impossible." },
    { title: "A YEAR OF CONSISTENCY 👑", body: "365 days. You are the definition of dedication." },
  ],

  // GENERIC FALLBACK (for days not covered)
  generic: [
    { title: "{streak} days!", body: "Consistency is a superpower. You have it." },
    { title: "{streak}-day streak", body: "Every day you show up, you vote for who you want to become." },
    { title: "Day {streak} ✓", body: "Another day of dedication. Another vote for your future self." },
    { title: "{streak} days strong", body: "This streak is proof that you can do hard things." },
    { title: "Streak: {streak}", body: "The number grows. So does your commitment." },
  ],
};

// ============================================================================
// 🎯 META/SELF-AWARE MESSAGES (Zomato's Signature Move)
// ============================================================================
// Breaking the 4th wall. Talking about being an app. The stuff that gets screenshotted.

const META_AWARE_MESSAGES = {
  hydration: [
    { title: "hey", body: "water?" },
    { title: "This is notification #{count}", body: "We're persistent. You're dehydrated. Let's fix one of those." },
    { title: "The notification writer is tired", body: "Of finding new ways to say 'drink water'. Help us out." },
    { title: "We could automate this", body: "But then who would guilt you about hydration? 💧" },
    { title: "We wrote 47 water reminders", body: "You've seen 0 glasses. The math isn't mathing." },
    { title: "This app is 90% water reminders", body: "And you're 60% water. We have a lot in common." },
    { title: "Plot twist", body: "The real hydration was the notifications we ignored along the way." },
    { title: "Notification #{count} today", body: "We don't give up. Neither should your kidneys." },
    { title: "This is your water reminder", body: "There, we said it. Happy now?" },
    { title: "We're out of clever water puns", body: "Just drink the water. Please." },
    { title: "The algorithm has spoken", body: "It says you need water. We don't argue with it." },
    { title: "I'm a hydration app", body: "Doing hydration app things. Like reminding you to hydrate." },
    { title: "Roses are red, violets are blue", body: "You haven't had water, and we're judging you." },
    { title: "This notification has one job", body: "Get you to drink water. Don't make it harder than it is." },
  ],
  food: [
    { title: "hey", body: "you gonna log that or nah?" },
    { title: "The food tracker app", body: "Politely asking about the food. For tracking. Purposes." },
    { title: "We know you ate", body: "The algorithm sees all. Log it." },
    { title: "Food was consumed", body: "Allegedly. We have no proof until you log it." },
    { title: "This app tracks food", body: "You have food. Somewhere. Log it?" },
    { title: "Breaking character", body: "I'm an app. You're a human. Log your food, human." },
    { title: "Plot twist:", body: "The meal you didn't log? Still counts calorically." },
    { title: "The food entry form", body: "Is feeling lonely. Visit it. Say hi. Log something." },
    { title: "Science says", body: "Unlogged food is still food. Wild, right?" },
    { title: "This is a food app", body: "Doing food app things. Like this." },
    { title: "We're not saying you ate", body: "We're just saying... did you?" },
  ],
  mood: [
    { title: "hey", body: "how are you actually?" },
    { title: "Mood check", body: "The app wants to know. The developer wants to know. Spill." },
    { title: "Your mood data:", body: "Empty. Like our hearts when you don't log." },
    { title: "We track feelings here", body: "In a completely normal, not-at-all-invasive way." },
    { title: "The mood question", body: "We ask it daily. You ignore it weekly. Classic us." },
    { title: "Emotional support notification", body: "Hi. How are you? Check a box. That's it. That's the ask." },
    { title: "Quick therapy session", body: "Tap a mood. Boom. You've processed an emotion today." },
  ],
  activity: [
    { title: "hey", body: "did you move today?" },
    { title: "Your step counter", body: "Is making concerned noises. Address it." },
    { title: "We counted your steps", body: "Well, tried to. The number is concerning. Move more." },
    { title: "The fitness notification", body: "Here to remind you that walking exists." },
    { title: "Your chair is winning", body: "The stand-up competition, that is. Move?" },
    { title: "Plot twist:", body: "The real workout was the stairs you took for no reason." },
    { title: "Movement reminder", body: "From your app that has no legs. Ironic, we know." },
  ],
  generic: [
    { title: "Notification check", body: "We're testing if you read these. Clearly you do. Hi." },
    { title: "The app is awake", body: "Are you? Let's do something productive." },
    { title: "This took 3 meetings to write", body: "Just kidding. It's just me. An app. Talking to you." },
    { title: "Breaking: App wants attention", body: "More at 11. Or now. Open the app." },
    { title: "We have notifications at home", body: "The notifications at home: this one." },
  ],
};

// ============================================================================
// 📱 ULTRA-SHORT FRIEND-TEXTING STYLE (Zomato's casual genius)
// ============================================================================
// When a notification sounds like your bestie texting you at 3pm

const ULTRA_SHORT_MESSAGES = {
  hydration: [
    { title: "water?", body: "just asking" },
    { title: "💧", body: "that's it. that's the reminder" },
    { title: "h2o time", body: "you know the drill" },
    { title: "drink something", body: "please" },
    { title: "quick one?", body: "a glass. of water. go" },
    { title: "psst", body: "water exists" },
    { title: "bro", body: "hydrate" },
    { title: "friendly reminder:", body: "water" },
    { title: "water check", body: "✓ or ✗?" },
    { title: "the usual?", body: "one glass. you know it." },
    { title: "sip sip", body: "pass it on to your throat" },
    { title: "refill?", body: "your bottle. your body. both." },
  ],
  food: [
    { title: "ate yet?", body: "just curious" },
    { title: "🍽️", body: "that's it. log something" },
    { title: "food?", body: "log it if you got it" },
    { title: "meal status?", body: "we need intel" },
    { title: "ate something?", body: "tell us about it" },
    { title: "quick log?", body: "3 seconds. that's all" },
    { title: "fed yourself?", body: "proud of you. log it." },
    { title: "the question:", body: "what did you eat?" },
    { title: "intake update?", body: "your body had food. the app wants receipts." },
  ],
  mood: [
    { title: "vibes?", body: "good? bad? mid? let us know" },
    { title: "how's it going", body: "actually though" },
    { title: "mood check ✓", body: "quick tap. big insights." },
    { title: "feeling?", body: "a single tap tells us everything" },
    { title: "today's vibe:", body: "you tell us" },
    { title: "one tap", body: "how are you?" },
  ],
  activity: [
    { title: "moved yet?", body: "just checking" },
    { title: "🚶", body: "a gentle suggestion" },
    { title: "steps?", body: "any?" },
    { title: "walk?", body: "even a short one counts" },
    { title: "stretch?", body: "your body is requesting one" },
    { title: "movement check", body: "have you?" },
  ],
};

// ============================================================================
// 📅 DAY-OF-WEEK AWARE MESSAGES (Because Monday hits different)
// ============================================================================

const DAY_OF_WEEK_MESSAGES = {
  monday: {
    hydration: [
      { title: "Monday hydration", body: "hits different. Start the week right." },
      { title: "It's Monday", body: "Your body needs more water to cope. Same." },
      { title: "Monday reminder", body: "The week is long. Hydration helps." },
      { title: "New week, new water", body: "Start fresh. Drink up." },
      { title: "Monday blues?", body: "Water helps. Scientifically unproven but emotionally true." },
    ],
    food: [
      { title: "Monday meal planning", body: "Let's not repeat last week's snack disasters." },
      { title: "Fresh start Monday", body: "Log your first meal of the week." },
      { title: "Monday motivation:", body: "Eating well starts now. Log it." },
    ],
    mood: [
      { title: "Monday mood check", body: "We need to know. For science. And support." },
      { title: "How's Monday treating you?", body: "Be honest. We won't tell anyone." },
    ],
    activity: [
      { title: "Monday movement", body: "Start the week by moving. Any amount counts." },
      { title: "New week momentum", body: "One walk sets the tone. Let's go." },
    ],
  },
  tuesday: {
    hydration: [
      { title: "Tuesday hydration", body: "The Monday panic is over. Drink in peace." },
      { title: "Taco Tuesday energy", body: "Needs Taco Tuesday hydration." },
    ],
    food: [
      { title: "Tuesday nutrition", body: "You survived Monday. Reward yourself (with logged meals)." },
    ],
    mood: [
      { title: "Tuesday vibes?", body: "Better than Monday? Worse? Let us know." },
    ],
    activity: [
      { title: "Tuesday movement", body: "Keep the Monday momentum going." },
    ],
  },
  wednesday: {
    hydration: [
      { title: "Hump day hydration", body: "Get over the hill with H2O." },
      { title: "Wednesday water check", body: "Halfway through. How's your intake?" },
      { title: "Midweek means", body: "Midweek hydration check. How's it going?" },
    ],
    food: [
      { title: "Wednesday food log", body: "Halfway through the week. Stay consistent." },
      { title: "Midweek fuel", body: "What's keeping you going? Log it." },
    ],
    mood: [
      { title: "Wednesday mood pulse", body: "Halfway there. How are you holding up?" },
    ],
    activity: [
      { title: "Midweek movement", body: "You're halfway. Keep moving." },
    ],
  },
  thursday: {
    hydration: [
      { title: "Thursday thoughts:", body: "Did you drink water? That's the whole thought." },
      { title: "Almost Friday hydration", body: "Power through. Water helps." },
    ],
    food: [
      { title: "Thursday food check", body: "The end is near. The logging continues." },
    ],
    mood: [
      { title: "Thursday mood", body: "So close to Friday. How are you?" },
    ],
    activity: [
      { title: "Thursday activity", body: "One more day of moving before the weekend." },
    ],
  },
  friday: {
    hydration: [
      { title: "Friday vibes", body: "but your water bottle is still empty" },
      { title: "Friday hydration", body: "End the work week hydrated, not desperate." },
      { title: "TGIF", body: "Thank God It's... time to drink water." },
      { title: "Weekend prep:", body: "Hydrate now. Party later. Or don't. Just hydrate." },
    ],
    food: [
      { title: "Friday food", body: "Whatever it is, log it. TGIF." },
      { title: "End of week eats", body: "Celebratory? Lazy? Either way, log it." },
    ],
    mood: [
      { title: "Friday feelings", body: "We hope they're good. Let us know!" },
      { title: "Weekend mood loading", body: "How's Friday treating you?" },
    ],
    activity: [
      { title: "Friday movement", body: "End the week strong. Move a little." },
    ],
  },
  saturday: {
    hydration: [
      { title: "Weekend water", body: "Hydration doesn't take days off. Neither should you." },
      { title: "Saturday sips", body: "Enjoying the weekend? Don't forget water." },
      { title: "Weekend mode: ON", body: "Water intake: should also be ON." },
    ],
    food: [
      { title: "Saturday eats", body: "Whatever weekend meals happen, we want to know." },
      { title: "Weekend calories", body: "Still count. Sorry. Log them?" },
    ],
    mood: [
      { title: "Saturday vibes", body: "Relaxed? Busy? Let us know how you're feeling." },
    ],
    activity: [
      { title: "Saturday activity", body: "Weekend movement is still movement." },
    ],
  },
  sunday: {
    hydration: [
      { title: "Sunday hydration", body: "Prepare for Monday by being hydrated now." },
      { title: "Sunday Scaries?", body: "Water helps. Not with everything, but it helps." },
      { title: "Rest day vibes", body: "But hydration doesn't rest. Drink up." },
    ],
    food: [
      { title: "Sunday meal prep", body: "Or Sunday meal chaos. Either way, log it." },
      { title: "End of weekend eats", body: "Monday is coming. Fuel up." },
    ],
    mood: [
      { title: "Sunday check-in", body: "How was your weekend? How are you?" },
      { title: "Pre-Monday mood", body: "Let's capture it before reality hits." },
    ],
    activity: [
      { title: "Sunday movement", body: "Active rest or just rest? Both valid. But log it." },
    ],
  },
};

// ============================================================================
// 🔥 MEME-READY SCREENSHOT-WORTHY CONTENT
// ============================================================================
// The ones users screenshot and share. The viral-worthy stuff.

const MEME_READY_MESSAGES = {
  hydration: [
    { title: "Your skin: 📉", body: "Your water intake: also 📉. Coincidence? Absolutely not." },
    { title: "Dehydration speedrun", body: "You're on pace for a world record. That's not a compliment." },
    { title: "Plot twist:", body: "The tiredness was dehydration all along." },
    { title: "Your cells rn:", body: "👁️💧👄💧👁️ please" },
    { title: "Water bottle POV:", body: "Being completely ignored for 4 hours straight." },
    { title: "Therapist: How are you?", body: "Me: Dehydrated. Therapist: That tracks." },
    { title: "Hydration status:", body: "404 Not Found" },
    { title: "Your kidneys typing...", body: "\"We need to talk about your water intake.\"" },
    { title: "The vibes are off", body: "The water intake is also off. Connected? Yes." },
    { title: "POV:", body: "You're reading this instead of drinking water" },
    { title: "Not to be dramatic", body: "But your body is 60% \"please drink water\"" },
    { title: "Main character energy", body: "But the main character is dehydrated" },
    { title: "Normalize", body: "Drinking water. That's it. That's the tweet." },
    { title: "Tell me you're dehydrated", body: "Without telling me you're dehydrated. Your app: 📊" },
    { title: "It's giving...", body: "Dehydration. The vibe is dehydration." },
  ],
  food: [
    { title: "Your stomach:", body: "Had food. Your app: Has questions." },
    { title: "Food was consumed", body: "Evidence required. Log the meal." },
    { title: "POV:", body: "You ate something delicious and didn't log it" },
    { title: "The audacity", body: "Of eating without logging. We're appalled." },
    { title: "Unhinged food take:", body: "If you don't log it, your body still metabolizes it." },
    { title: "Plot twist:", body: "The snack you \"forgot\" was 300 calories." },
    { title: "Be honest", body: "What did you eat between meals? We saw that." },
    { title: "Food log status:", body: "Suspiciously empty. Stomach: Suspiciously not." },
    { title: "The algorithm noticed", body: "A gap in your food logs. It has concerns." },
    { title: "Tell me you ate", body: "Without telling me you ate. Your stomach: 🔈🔉🔊" },
  ],
  mood: [
    { title: "Emotional support notification", body: "This is it. This is the support. How are you?" },
    { title: "Your feelings:", body: "Valid. Your logging of them: Pending." },
    { title: "Mood: not tracked", body: "Vibe: unknown. This is a problem." },
    { title: "Hot take:", body: "Tracking mood helps mood. Revolutionary, we know." },
    { title: "The feelings are there", body: "We just need you to tap one." },
    { title: "Your mental health check", body: "Is checking. Are you checking back?" },
  ],
  activity: [
    { title: "Your Fitbit is crying", body: "Metaphorically. Because you haven't moved." },
    { title: "Step count: concerning", body: "Chair time: excessive. Let's fix one of those." },
    { title: "Your legs:", body: "Remember us? We're down here. Ready to walk." },
    { title: "Hot take:", body: "Standing is technically exercise. Do that at least." },
    { title: "POV:", body: "You've been sitting so long the chair is your new personality" },
    { title: "The floor is lava", body: "But the couch is your best friend. Get up." },
    { title: "Your spine:", body: "Is filing a complaint about the sitting situation." },
    { title: "Movement update:", body: "None. This is the update. Change it." },
  ],
  streak: [
    { title: "The streak:", body: "Alive. Your commitment: Unmatched. The vibe: Immaculate." },
    { title: "Plot armor:", body: "But for your streak. It refuses to die." },
    { title: "This streak is canon", body: "In your wellness story. Keep writing it." },
    { title: "Main character energy:", body: "But make it a {streak}-day streak." },
    { title: "The streak today:", body: "Thriving. You today: Also thriving. Connection? Yes." },
    { title: "POV:", body: "You protected your streak. Again. Legend behavior." },
  ],
};

// ============================================================================
// RE-ENGAGEMENT MESSAGES
// ============================================================================

const REENGAGEMENT_MESSAGES = {
  // 2-3 days inactive
  shortGap: [
    { title: "Miss you (but not in a weird way)", body: "Your data is waiting. Pick up where you left off?" },
    { title: "Been a minute", body: "{days} days since we talked. Everything okay?" },
    { title: "Quick check-in", body: "We haven't seen you in {days} days. No pressure, just curious." },
  ],

  // 4-7 days inactive
  mediumGap: [
    { title: "Your insights miss you 📊", body: "{totalDays} days of data waiting. One log to pick up where you left off." },
    { title: "Patterns fading", body: "We were learning your patterns. Would love to keep going." },
    { title: "Still here for you", body: "Whenever you're ready, we're ready." },
  ],

  // 7+ days with previous streak
  longGapWithStreak: [
    { title: "Remember that {streak}-day streak? 🔥", body: "It was impressive. Ready to beat it?" },
    { title: "Comeback story loading", body: "Your best streak was {streak} days. Round 2?" },
    { title: "You've done this before", body: "{streak} days proves you can. Start fresh today?" },
  ],

  // Gentle (never guilt-trippy)
  gentle: [
    { title: "No pressure", body: "Life happens. We're here when you're ready." },
    { title: "Whenever you're back", body: "Your data will be waiting. Take your time." },
  ],
};

// ============================================================================
// PREDICTION CHECK-IN MESSAGES (Replacing generic ones)
// ============================================================================

const PREDICTION_CHECKIN_MESSAGES = {
  food: {
    energy_crash: [
      { title: "Energy check-in ⚡", body: "That sugar spike earlier... did the crash come? Be honest.", buttons: ["😴 Crashed", "😊 Nope!", "🤷 Unsure"] },
      { title: "How's your energy?", body: "We predicted a dip around now. Were we right?", buttons: ["😴 Yeah...", "💪 Wrong!", "😐 Kinda"] },
    ],
    hunger: [
      { title: "Hunger status?", body: "It's been a while since food. How are you holding up?", buttons: ["😤 Hangry", "👍 Fine", "🍿 Snacked"] },
    ],
    sleep_impact: [
      { title: "Sleep quality check", body: "That late meal last night... did it affect your sleep?", buttons: ["😴 Terribly", "✨ Slept great", "😐 Hard to tell"] },
    ],
  },
  hydration: {
    dehydration: [
      { title: "Hydration reality check 💧", body: "You've been running low on water. Feel it?", buttons: ["🥱 Definitely", "💪 I'm fine", "🤷 Maybe"] },
      { title: "Water check", body: "Low hydration often = low energy. Noticing anything?", buttons: ["😵 Foggy", "😊 Clear", "🤔 Slightly"] },
    ],
    dehydration_headache: [
      { title: "Head feeling okay?", body: "Low water can cause headaches. Any pressure?", buttons: ["🤕 Headache", "😊 All clear", "😐 Slight"] },
    ],
  },
  mood: {
    mood_dip: [
      { title: "Mood pulse 💭", body: "Based on your patterns, this might be a dip time. True?", buttons: ["😔 Yeah", "😊 Actually good", "😐 Neutral"] },
    ],
    stress_fatigue: [
      { title: "Stress check 🧘", body: "High stress drains energy. How's your tank?", buttons: ["😓 Empty", "💪 Coping", "😤 Stressed"] },
    ],
  },
  activity: {
    activity_fatigue: [
      { title: "Body report 🏃", body: "After that workout, how are you feeling?", buttons: ["😫 Dead", "💪 Strong", "🦵 Sore-ish"] },
    ],
    recovery_needed: [
      { title: "Recovery check", body: "Yesterday was intense. Muscles okay?", buttons: ["😣 Very sore", "✨ Recovered", "🤏 Bit tight"] },
    ],
    movement_reminder: [
      { title: "Been sitting a while", body: "Any stiffness or low energy kicking in?", buttons: ["😩 Stiff", "👍 Fine", "🚶 Just moved"] },
    ],
  },
};

// ============================================================================
// MESSAGE SELECTION ENGINE
// ============================================================================

/**
 * Get a random message from an array of variants
 */
function pickRandom(messages) {
  if (!messages || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Replace template variables in message
 */
function interpolate(message, context = {}) {
  if (!message) return null;

  let { title, body, buttons } = message;

  // Replace all {variable} patterns
  const replace = (str) => {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  };

  return {
    title: replace(title),
    body: replace(body),
    buttons: buttons || undefined,
  };
}

/**
 * Get time of day category
 */
function getTimeOfDay(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get meal time category
 */
function getMealTime(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return null;
}

/**
 * Get current day of week as lowercase string
 */
function getDayOfWeek() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * MESSAGE STYLE PROBABILITY WEIGHTS
 * - 60% chance: Standard contextual message (the default)
 * - 15% chance: Meta/self-aware message (Zomato signature)
 * - 10% chance: Ultra-short friend texting style
 * - 10% chance: Day-of-week aware message
 * - 5% chance: Meme-ready/screenshot-worthy message
 */
function selectMessageStyle() {
  const rand = Math.random();
  if (rand < 0.60) return 'standard';
  if (rand < 0.75) return 'meta';
  if (rand < 0.85) return 'ultraShort';
  if (rand < 0.95) return 'dayAware';
  return 'memeReady';
}

/**
 * Try to get a special style message for a domain
 * Returns null if that style isn't available for the domain
 */
function getSpecialStyleMessage(style, domain, context = {}) {
  const dayOfWeek = getDayOfWeek();

  switch (style) {
    case 'meta':
      if (META_AWARE_MESSAGES[domain]) {
        return interpolate(pickRandom(META_AWARE_MESSAGES[domain]), context);
      }
      break;

    case 'ultraShort':
      if (ULTRA_SHORT_MESSAGES[domain]) {
        return pickRandom(ULTRA_SHORT_MESSAGES[domain]);
      }
      break;

    case 'dayAware':
      if (DAY_OF_WEEK_MESSAGES[dayOfWeek]?.[domain]) {
        return pickRandom(DAY_OF_WEEK_MESSAGES[dayOfWeek][domain]);
      }
      break;

    case 'memeReady':
      if (MEME_READY_MESSAGES[domain]) {
        return interpolate(pickRandom(MEME_READY_MESSAGES[domain]), context);
      }
      break;
  }

  return null;
}

/**
 * Try special message styles first, fall back to standard if unavailable
 */
function trySpecialMessageOrFallback(domain, standardMessageFn, context = {}) {
  const style = selectMessageStyle();

  // Only try special styles for non-standard selection
  if (style !== 'standard') {
    const specialMessage = getSpecialStyleMessage(style, domain, context);
    if (specialMessage) {
      // Add message style tag for analytics
      return { ...specialMessage, _style: style };
    }
  }

  // Fall back to standard message
  const standardMessage = standardMessageFn();
  if (standardMessage) {
    return { ...standardMessage, _style: 'standard' };
  }

  return null;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate hydration message based on context
 * Now with 40% chance of Zomato-style special messages!
 */
export function getHydrationMessage(context) {
  const {
    percentage = 0,
    currentMl = 0,
    goalMl = 2000,
    hoursSinceLastLog = null,
    streak = 0,
    logCount = 0,
    hasCaffeine = false,
    temperature = null,
    notificationCount = 1, // For meta message interpolation
  } = context;

  const remaining = goalMl - currentMl;
  const hour = new Date().getHours();
  const timeOfDay = getTimeOfDay(hour);
  const hoursLeft = Math.max(1, 22 - hour); // Assume day ends at 10pm

  // Context for interpolation
  const interpolationContext = {
    remaining,
    percentage,
    streak,
    hours: hoursSinceLastLog,
    hoursLeft,
    count: notificationCount,
    temp: temperature,
  };

  // Standard message selection logic (wrapped in function for trySpecialMessageOrFallback)
  const getStandardMessage = () => {
    // 1. Goal achieved (always show celebration, no special override)
    if (percentage >= 100) {
      if (streak > 1) {
        return interpolate(pickRandom(HYDRATION_MESSAGES.goalWithStreak), { streak });
      }
      return pickRandom(HYDRATION_MESSAGES.goalAchieved);
    }

    // 2. Almost there
    if (percentage >= 75) {
      return interpolate(pickRandom(HYDRATION_MESSAGES.almostThere), { remaining, percentage });
    }

    // 3. Caffeine context
    if (hasCaffeine) {
      return pickRandom(HYDRATION_MESSAGES.caffeineAware);
    }

    // 4. Weather context
    if (temperature !== null) {
      if (temperature > 30) {
        return interpolate(pickRandom(HYDRATION_MESSAGES.weatherAware.hot), { temp: temperature });
      }
      if (temperature < 10) {
        return pickRandom(HYDRATION_MESSAGES.weatherAware.cold);
      }
    }

    // 5. Behind pace
    if (hoursSinceLastLog && hoursSinceLastLog >= 2 && percentage < 80) {
      return interpolate(pickRandom(HYDRATION_MESSAGES.behindPace), {
        hours: hoursSinceLastLog,
        remaining,
        hoursLeft,
      });
    }

    // 6. No logs today
    if (logCount === 0 && hour >= 10) {
      const timeMessages = HYDRATION_MESSAGES.noLogsToday[timeOfDay];
      return pickRandom(timeMessages || HYDRATION_MESSAGES.noLogsToday.morning);
    }

    // 7. Time-specific nudges
    if (hour >= 6 && hour < 8) {
      return pickRandom(HYDRATION_MESSAGES.timeSpecific.wakeUp);
    }
    if (hour >= 22) {
      return pickRandom(HYDRATION_MESSAGES.timeSpecific.beforeBed);
    }

    return null;
  };

  // For goal achieved, skip special styles (user deserves proper celebration)
  if (percentage >= 100) {
    return getStandardMessage();
  }

  // Try special Zomato-style messages with fallback to standard
  return trySpecialMessageOrFallback('hydration', getStandardMessage, interpolationContext);
}

/**
 * Generate food/meal message based on context
 * Now with 40% chance of Zomato-style special messages!
 */
export function getFoodMessage(context) {
  const {
    mealsLogged = 0,
    totalCalories = 0,
    calorieGoal = 2000,
    streak = 0,
    lastMealHours = null,
    mealsToday = 0,
  } = context;

  const hour = new Date().getHours();
  const mealTime = getMealTime(hour);
  const caloriesRemaining = calorieGoal - totalCalories;

  // Context for interpolation
  const interpolationContext = {
    streak,
    remaining: caloriesRemaining,
    mealsToday: mealsToday || mealsLogged,
    hours: lastMealHours,
  };

  // Standard message selection logic
  const getStandardMessage = () => {
    // 1. Streak protection (evening) - always priority
    if (streak > 0 && hour >= 20 && mealsLogged < 2) {
      return interpolate(pickRandom(FOOD_MESSAGES.streakProtection), { streak });
    }

    // 2. Calorie awareness
    if (totalCalories > 0 && calorieGoal > 0) {
      if (caloriesRemaining > 0 && caloriesRemaining < 500 && hour >= 18) {
        return interpolate(pickRandom(FOOD_MESSAGES.calorieAwareness.roomForMore), { remaining: caloriesRemaining });
      }
    }

    // 3. No meals logged
    if (mealsLogged === 0 && mealTime) {
      return pickRandom(FOOD_MESSAGES.noMealsToday[mealTime]);
    }

    // 4. Meal timing gap
    if (lastMealHours && lastMealHours >= 5) {
      return interpolate(pickRandom(FOOD_MESSAGES.mealTiming.mealGap), { hours: lastMealHours });
    }

    return null;
  };

  // For streak protection, skip special styles (urgency matters)
  if (streak > 0 && hour >= 20 && mealsLogged < 2) {
    return getStandardMessage();
  }

  // Try special Zomato-style messages with fallback to standard
  return trySpecialMessageOrFallback('food', getStandardMessage, interpolationContext);
}

/**
 * Generate streak message
 * With occasional meme-ready celebration variants!
 */
export function getStreakMessage(streakDays) {
  // 20% chance of meme-ready streak message
  if (Math.random() < 0.20 && MEME_READY_MESSAGES.streak) {
    const memeMessage = interpolate(pickRandom(MEME_READY_MESSAGES.streak), { streak: streakDays });
    if (memeMessage) return { ...memeMessage, _style: 'memeReady' };
  }

  // Check for specific milestone
  if (STREAK_MESSAGES[streakDays]) {
    return pickRandom(STREAK_MESSAGES[streakDays]);
  }

  // Use generic with interpolation
  return interpolate(pickRandom(STREAK_MESSAGES.generic), { streak: streakDays });
}

/**
 * Generate mood message
 * Now with 40% chance of Zomato-style special messages!
 */
export function getMoodMessage(context) {
  const { hour = new Date().getHours(), moodValue = null, pattern = null } = context;

  // Context for interpolation
  const interpolationContext = { pattern };

  // Standard message selection logic
  const getStandardMessage = () => {
    if (pattern) {
      return interpolate(pickRandom(MOOD_MESSAGES.patternDetected), { pattern });
    }

    if (hour >= 19 && hour < 22) {
      return pickRandom(MOOD_MESSAGES.checkIn.evening);
    }

    if (hour >= 14 && hour < 17) {
      return pickRandom(MOOD_MESSAGES.checkIn.afternoon);
    }

    return null;
  };

  // If there's a pattern detected, show it (important insight)
  if (pattern) {
    return getStandardMessage();
  }

  // Try special Zomato-style messages with fallback to standard
  return trySpecialMessageOrFallback('mood', getStandardMessage, interpolationContext);
}

/**
 * Generate activity message
 * Now with 40% chance of Zomato-style special messages!
 */
export function getActivityMessage(context) {
  const {
    steps = 0,
    stepGoal = 10000,
    justWorkedOut = false,
    sedentaryHours = 0,
  } = context;

  const percentage = Math.round((steps / stepGoal) * 100);
  const remaining = stepGoal - steps;

  // Context for interpolation
  const interpolationContext = {
    steps: steps.toLocaleString(),
    distance: `${(steps * 0.0008).toFixed(1)}km`,
    remaining: remaining.toLocaleString(),
    percentage,
  };

  // Standard message selection logic
  const getStandardMessage = () => {
    if (justWorkedOut) {
      return pickRandom(ACTIVITY_MESSAGES.postWorkout);
    }

    if (percentage >= 100) {
      return interpolate(pickRandom(ACTIVITY_MESSAGES.stepGoal.achieved), {
        steps: steps.toLocaleString(),
        distance: `${(steps * 0.0008).toFixed(1)}km`,
      });
    }

    if (percentage >= 80) {
      return interpolate(pickRandom(ACTIVITY_MESSAGES.stepGoal.almostThere), {
        remaining: remaining.toLocaleString(),
        percentage,
      });
    }

    if (sedentaryHours >= 2) {
      return pickRandom(ACTIVITY_MESSAGES.sedentaryNudge);
    }

    if (percentage < 30 && new Date().getHours() >= 14) {
      return interpolate(pickRandom(ACTIVITY_MESSAGES.stepGoal.behindPace), {
        steps: steps.toLocaleString(),
      });
    }

    return null;
  };

  // For goal achieved or post-workout, show celebration (skip special)
  if (percentage >= 100 || justWorkedOut) {
    return getStandardMessage();
  }

  // Try special Zomato-style messages with fallback to standard
  return trySpecialMessageOrFallback('activity', getStandardMessage, interpolationContext);
}

/**
 * Generate re-engagement message
 */
export function getReengagementMessage(context) {
  const { daysInactive = 0, previousStreak = 0, totalDays = 0 } = context;

  if (daysInactive >= 7 && previousStreak > 0) {
    return interpolate(pickRandom(REENGAGEMENT_MESSAGES.longGapWithStreak), {
      streak: previousStreak,
    });
  }

  if (daysInactive >= 4) {
    return interpolate(pickRandom(REENGAGEMENT_MESSAGES.mediumGap), {
      days: daysInactive,
      totalDays,
    });
  }

  if (daysInactive >= 2) {
    return interpolate(pickRandom(REENGAGEMENT_MESSAGES.shortGap), {
      days: daysInactive,
    });
  }

  return null;
}

/**
 * Generate prediction check-in message
 */
export function getPredictionCheckInMessage(domain, predictionType, context = {}) {
  const domainMessages = PREDICTION_CHECKIN_MESSAGES[domain];
  if (!domainMessages) return null;

  const typeMessages = domainMessages[predictionType];
  if (!typeMessages) return null;

  return interpolate(pickRandom(typeMessages), context);
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get a random meta/casual style message for any domain
 * Use when you want to guarantee a casual, friend-texting vibe
 */
export function getCasualMessage(domain) {
  const styles = ['meta', 'ultraShort', 'memeReady'];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const message = getSpecialStyleMessage(style, domain, {});
  return message ? { ...message, _style: style } : null;
}

/**
 * Get a day-aware message for any domain
 */
export function getDayAwareMessage(domain) {
  const dayOfWeek = getDayOfWeek();
  if (DAY_OF_WEEK_MESSAGES[dayOfWeek]?.[domain]) {
    return pickRandom(DAY_OF_WEEK_MESSAGES[dayOfWeek][domain]);
  }
  return null;
}

export default {
  // Core message generators
  getHydrationMessage,
  getFoodMessage,
  getStreakMessage,
  getMoodMessage,
  getActivityMessage,
  getReengagementMessage,
  getPredictionCheckInMessage,

  // Special style getters
  getCasualMessage,
  getDayAwareMessage,

  // Constants
  DOMAINS,

  // Export raw messages for testing/debugging/custom selection
  _messages: {
    HYDRATION_MESSAGES,
    FOOD_MESSAGES,
    MOOD_MESSAGES,
    ACTIVITY_MESSAGES,
    STREAK_MESSAGES,
    REENGAGEMENT_MESSAGES,
    PREDICTION_CHECKIN_MESSAGES,
    // Zomato-style special messages
    META_AWARE_MESSAGES,
    ULTRA_SHORT_MESSAGES,
    DAY_OF_WEEK_MESSAGES,
    MEME_READY_MESSAGES,
  },

  // Utilities
  _utils: {
    pickRandom,
    interpolate,
    getTimeOfDay,
    getMealTime,
    getDayOfWeek,
    selectMessageStyle,
  },
};
