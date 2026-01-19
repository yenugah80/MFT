/**
 * Witty Messages - Playful & Friendly Notifications
 *
 * Tone: 70% playful with Gen-Z energy, 30% clear and warm
 * Fun and relatable while staying genuine.
 *
 * Architecture:
 * - Uses MessageFreshnessManager for variety (no immediate repeats)
 * - Persists history across sessions
 * - Configurable freshness windows per category
 */

import { pickFresh as pickFreshFromManager } from '../services/intelligence/MessageFreshnessManager';

// Fallback pick for when freshness manager isn't needed or available
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Smart pick that uses freshness manager when category is provided
const pick = (arr, category = null) => {
  if (!category || !Array.isArray(arr) || arr.length <= 1) {
    return pickRandom(arr);
  }
  try {
    return pickFreshFromManager(arr, category);
  } catch {
    // Fallback if freshness manager not initialized
    return pickRandom(arr);
  }
};

// ============== HYDRATION ==============
export const hydrationMessages = {
  logged: (amount, type = 'water') => {
    const waterTemplates = [
      (a) => `${a}ml down! Your cells are throwing a party 🎉`,
      (a) => `Splash! ${a}ml logged. Hydration game: strong`,
      (a) => `${a}ml of H2-Ohhhh yeah!`,
      (a) => `Glug glug! ${a}ml added. Your body says thanks`,
      (a) => `${a}ml closer to glowing skin status`,
      (a) => `Water logged! ${a}ml of pure refreshment`,
      (a) => `${a}ml secured. Staying hydrated like a boss`,
      (a) => `Hydration station! ${a}ml checked in`,
    ];

    const coffeeTemplates = [
      (a) => `${a}ml of liquid ambition logged ☕`,
      (a) => `Caffeine delivery confirmed! ${a}ml of go-juice`,
      () => `Coffee break documented. Productivity incoming!`,
      (a) => `Brew-tiful! ${a}ml of bean magic`,
      (a) => `${a}ml of morning fuel logged`,
      () => `Coffee logged! Your future self is grateful`,
    ];

    const teaTemplates = [
      (a) => `${a}ml of zen in a cup 🍵`,
      () => `Tea time logged! Serenity achieved`,
      (a) => `Steeped and noted. ${a}ml of calm`,
      (a) => `${a}ml of cozy vibes secured`,
      () => `Tea logged! Sophisticated choice, friend`,
    ];

    const juiceTemplates = [
      (a) => `${a}ml of fruity goodness! 🍊`,
      () => `Juice logged! Vitamin party started`,
      (a) => `${a}ml of liquid sunshine`,
    ];

    const milkTemplates = [
      (a) => `${a}ml of calcium goodness 🥛`,
      () => `Milk logged! Strong bones incoming`,
      (a) => `Got milk? You sure do! ${a}ml`,
    ];

    const lowerType = type?.toLowerCase() || '';
    let templates = waterTemplates;
    let category = 'hydration.logged.water';

    if (lowerType.includes('coffee') || lowerType.includes('espresso')) {
      templates = coffeeTemplates;
      category = 'hydration.logged.coffee';
    } else if (lowerType.includes('tea')) {
      templates = teaTemplates;
      category = 'hydration.logged.tea';
    } else if (lowerType.includes('juice') || lowerType.includes('smoothie')) {
      templates = juiceTemplates;
      category = 'hydration.logged.juice';
    } else if (lowerType.includes('milk')) {
      templates = milkTemplates;
      category = 'hydration.logged.milk';
    }

    const selectedTemplate = pick(templates, category);
    return selectedTemplate(amount);
  },

  removed: () => pick([
    'Entry gone! We all make mistakes',
    'Poof! That entry never happened',
    'Deleted. Fresh start incoming 👀',
    'Gone! Your hydration history is rewritten',
  ], 'hydration.removed'),

  goalReached: () => pick([
    'HYDRATION GOAL CRUSHED! Your kidneys are grateful 💧',
    'Goal achieved! You beautiful hydrated legend',
    'Water champion of the day right here! 🏆',
    '100% hydrated! Your skin is glowing already',
    'Goal smashed! You absolute hydration hero',
  ], 'hydration.goalReached'),
};

// ============== MOOD ==============
export const moodMessages = {
  logged: (mood) => {
    const happyMessages = [
      'Good vibes documented! 😊',
      'Happiness logged. Keep radiating!',
      'Your joy has been noted. Love it!',
      'Smiles per hour: high! Logged it',
      'Happy logged! Your positivity is contagious',
    ];

    const calmMessages = [
      'Zen mode: activated 😌',
      'Calm logged. Inner peace unlocked',
      'Serenity noted. You peaceful human',
      'Calm vibes captured. Beautiful!',
      'Logged! Your calm energy is inspiring',
    ];

    const focusedMessages = [
      'Focus mode: engaged 🎯',
      'Laser focus logged! Get it done',
      'Concentration documented. Unstoppable!',
      'In the zone! Focus level: elite',
      'Logged! Productivity mode activated',
    ];

    const energizedMessages = [
      'Energy levels: through the roof ⚡',
      'Energized logged! Go conquer the day',
      'Power mode activated! Logged it',
      'Full battery vibes documented',
      'Energized! Watch out world',
    ];

    const neutralMessages = [
      'Neutral noted. Steady as she goes',
      'Balanced vibes logged 🙂',
      'Even keel documented. Stability is key',
      'Logged! Sometimes okay is perfect',
      'Neutral logged. Tomorrow could surprise you',
    ];

    const tiredMessages = [
      'Rest is productive too 😴',
      'Recharge mode: on. You deserve it',
      'Tired logged. Permission to nap granted',
      'Self-care time? Your body knows best',
      'Rest documented. Recovery is powerful',
    ];

    const stressedMessages = [
      'Feeling the pressure? Deep breaths help 💨',
      'Logged. Brighter moments ahead',
      'Noted. Tea and a break might feel nice?',
      'One thing at a time. You got this',
      'Logged with care. You\'re doing great',
    ];

    const sadMessages = [
      'Noted with care. Sending virtual hugs 🤗',
      'Logged. Tomorrow is a fresh page',
      'It\'s okay to feel. We\'re here with you',
      'We see you. Brighter moments ahead',
      'Logged. Your feelings are valid and important',
    ];

    const moodMap = {
      happy: happyMessages,
      calm: calmMessages,
      focused: focusedMessages,
      energized: energizedMessages,
      neutral: neutralMessages,
      tired: tiredMessages,
      stressed: stressedMessages,
      sad: sadMessages,
    };

    const category = `mood.logged.${mood || 'default'}`;
    return pick(moodMap[mood] || [
      'Mood captured! 📝',
      'Feeling noted. Self-awareness level: pro',
      'Logged! Emotional intelligence: unlocked',
      'Mood documented. You reflective human',
    ], category);
  },
};

// ============== FOOD ==============
export const foodMessages = {
  logged: () => pick([
    'Meal logged! Your future self says thanks 🍽️',
    'Delicious data captured!',
    'Nom nom noted! Nutrition: documented',
    'Meal in the books! Accountability: 100%',
    'Food logged. You organized legend, you',
    'Logged! Your diet diary grows stronger',
    'Meal captured! Mindful eating: unlocked',
    'Nutrition intel secured! 📊',
  ], 'food.logged'),

  quickAdded: (foodName) => {
    const templates = [
      (n) => `${n} added in a flash! ⚡`,
      (n) => `Quick add: ${n}. Speed demon!`,
      (n) => `${n} logged. That was fast!`,
      (n) => `Boom! ${n} documented`,
      (n) => `${n} captured. Efficiency: maximum`,
    ];
    const selected = pick(templates, 'food.quickAdded');
    return selected(foodName);
  },

  savedMealLoaded: (name) => {
    const templates = [
      (n) => `"${n}" loaded. Smart choice! 🧠`,
      (n) => `${n} ready to log. Efficiency mode: ON`,
      (n) => `Loaded "${n}". Past you was clever`,
      (n) => `${n} queued up! One-tap logging FTW`,
    ];
    const selected = pick(templates, 'food.savedMealLoaded');
    return selected(name);
  },

  analyzed: () => pick([
    'AI magic complete! ✨',
    'Nutrition decoded! Science is cool',
    'Food analyzed. Data acquired!',
    'Analysis complete! Knowledge is power',
    'Nutrition breakdown ready! 🔬',
  ], 'food.analyzed'),

  readyToLog: (mealType) => {
    const templates = [
      (m) => `Ready to capture some ${m || 'food'}! 📸`,
      (m) => `${m || 'Meal'} logging mode: activated`,
      (m) => `Let's log that ${m || 'deliciousness'}!`,
      (m) => `${m || 'Food'} tracker standing by!`,
    ];
    const selected = pick(templates, 'food.readyToLog');
    return selected(mealType);
  },
};

// ============== ACTIVITY ==============
export const activityMessages = {
  logged: (minutes, type) => {
    const templates = [
      (m, t) => `${m} mins of ${t || 'movement'}! Crushing it 💪`,
      () => `Movement logged! Your body thanks you`,
      (m) => `${m} minutes well spent. Future you is grateful`,
      () => `Active minutes secured! Endorphins: released`,
      (m, t) => `${m} mins of ${t || 'activity'} documented. Beast mode!`,
      () => `Workout logged! Gains incoming 📈`,
      (m) => `${m} minutes of awesome captured`,
      () => `Activity noted! Couch: defeated`,
    ];
    const selected = pick(templates, 'activity.logged');
    return selected(minutes, type);
  },
};

// ============== STREAK ==============
export const streakMessages = {
  continued: (days) => {
    const templates = [
      (d) => `${d} days strong! Unstoppable 🔥`,
      (d) => `Day ${d}! You're absolutely on fire`,
      (d) => `Streak extended to ${d}! Living legend`,
      (d) => `${d} day streak! Consistency is your superpower`,
      (d) => `Day ${d} crushed! Who even are you?!`,
      (d) => `${d} days and counting! Dedication: elite`,
    ];
    const selected = pick(templates, 'streak.continued');
    return selected(days);
  },

  freezeEarned: () => pick([
    'Streak freeze earned! Insurance secured 🛡️',
    'New streak freeze unlocked! Safety first',
    'Safety net acquired. Smart cookie!',
    'Freeze unlocked! Your streak is protected',
    'Backup plan secured! Well played',
  ], 'streak.freezeEarned'),

  milestone: (days) => {
    const templates = [
      (d) => `${d} DAYS! You absolute legend! 🎉`,
      (d) => `Milestone: ${d} days! Hall of fame material`,
      (d) => `${d} day streak! This calls for celebration`,
      (d) => `WOW! ${d} days! Take a bow 🏆`,
    ];
    const selected = pick(templates, 'streak.milestone');
    return selected(days);
  },

  // CRITICAL: Supportive messages for when streak is lost
  lost: (previousDays) => {
    const templates = [
      (d) => `${d} days was amazing! Ready for round two? 💪`,
      () => `Streaks reset, but your progress stays with you`,
      () => `Fresh start! Your next streak begins now`,
      (d) => `${d} days of growth. That knowledge is forever yours`,
      () => `One day at a time. Today is Day 1 of something great`,
      () => `The best time to restart? Right now. Let's go!`,
      (d) => `${d} days proved you can do it. Now do it again!`,
      () => `New streak, same awesome you. Ready when you are`,
    ];
    const selected = pick(templates, 'streak.lost');
    return selected(previousDays);
  },

  // When streak freeze saves the day
  saved: () => pick([
    'Streak freeze activated! Your streak lives on 🛡️',
    'Close call! Freeze used, streak protected',
    'Phew! Your streak freeze saved the day',
    'Safety net deployed! Streak intact',
    'Freeze to the rescue! You\'re still going strong',
  ], 'streak.saved'),

  // Encouraging restart after loss
  restart: () => pick([
    'Day 1! Every champion starts here',
    'Fresh start, fresh energy. Let\'s build!',
    'New streak unlocked! The comeback begins',
    'Day 1 of your next great streak 🌟',
    'Starting fresh! Your best streak is ahead',
  ], 'streak.restart'),

  // Close call - when user logs just in time
  closeCall: () => pick([
    'Just in time! Streak saved by seconds ⏱️',
    'Cutting it close! But you made it',
    'Phew! That was a close one. Streak continues!',
    'Last minute save! Your streak stays alive',
  ], 'streak.closeCall'),

  // Streak at risk warning (for notifications)
  atRisk: (hoursLeft) => {
    const templates = [
      (h) => `${h} hours to keep your streak alive!`,
      (h) => `Quick log? ${h} hours left on your streak`,
      () => `Your streak is waiting for today's log`,
      (h) => `${h} hours to go! Don't let your streak slip`,
    ];
    const selected = pick(templates, 'streak.atRisk');
    return selected(hoursLeft);
  },
};

// ============== GOALS ==============
export const goalMessages = {
  updated: () => pick([
    'Goal updated! Aim high, friend',
    'New target locked in!',
    'Goal set. Let\'s crush it!',
    'Updated! Your ambition is noted',
  ], 'goals.updated'),

  reached: (goalType) => {
    const templates = [
      (g) => `${g || 'Goal'} achieved! Victory dance time 🎉`,
      (g) => `You did it! ${g || 'Goal'} complete`,
      (g) => `${g || 'Target'} crushed! What's next?`,
    ];
    const selected = pick(templates, 'goals.reached');
    return selected(goalType);
  },
};

// ============== INSIGHTS ==============
export const insightMessages = {
  patternDismissed: () => pick([
    'Pattern dismissed. We\'ll do better!',
    'Noted! Not all patterns are keepers',
    'Dismissed. Thanks for keeping us honest!',
  ], 'insights.patternDismissed'),

  noInsights: () => pick([
    'No insights yet. Keep logging!',
    'Insights are brewing. Check back soon!',
    'Need more data to work with here',
  ], 'insights.noInsights'),

  shareError: () => pick([
    'Couldn\'t share right now. Try again?',
    'Sharing hiccup! Give it another shot',
    'The share button is being shy. Retry?',
  ], 'insights.shareError'),

  savedForLater: () => pick([
    'Saved for later! Smart move',
    'Bookmarked! Your future self will thank you',
    'Noted for later. Organizational skills: 100',
  ], 'insights.savedForLater'),

  actionTip: (action) => action || pick([
    'Pro tip noted!',
    'Good advice incoming!',
    'Wisdom unlocked!',
  ], 'insights.actionTip'),
};

// ============== GENERAL ==============
export const generalMessages = {
  success: () => pick([
    'Done and dusted! ✨',
    'Nailed it! High five 🙌',
    'All set! You efficient human',
    'Success! That was smooth',
    'Boom! Mission accomplished',
    'Done! You make it look easy',
  ], 'general.success'),

  error: () => pick([
    'Oops! Let\'s try that again 😅',
    'Hmm, let\'s give it another shot?',
    'One more try? We believe in you!',
    'Quick retry? Almost there!',
    'Let\'s try that again together',
    'Ready for round two? Let\'s go!',
  ], 'general.error'),

  feedbackThanks: () => pick([
    'Thanks for the feedback! 🙏',
    'Noted! Your input makes us better',
    'Feedback received. You rock!',
    'Thanks! Every bit helps us improve',
    'Heard! Your voice matters here',
  ], 'general.feedbackThanks'),

  reportThanks: () => pick([
    'Thanks! Our team will review this 👀',
    'Report received. We\'re on it!',
    'Flagged for review. Thanks for helping!',
    'Noted! We\'ll look into this',
    'Thanks for keeping us honest!',
  ], 'general.reportThanks'),
};

// ============== CONTEXT-AWARE REMINDERS ==============
// Time-of-day specific nudges for the Intelligence Orchestrator

export const reminderMessages = {
  hydration: {
    morning: [
      'Rise and hydrate! Your body lost fluids overnight',
      'Good morning! Your body needs water after sleep',
      'Coffee is great, but water first? Even better',
      'Morning hydration: the original energy boost',
      'Your organs are sending thirsty signals this morning',
      'First sip of the day matters. Make it water',
    ],
    afternoon: [
      'Afternoon boost? Water can help you power through!',
      'Stay sharp this afternoon with a quick water break',
      'Halfway through the day, halfway to your water goal?',
      'Your focus loves water. Time for a refill?',
      'Hydration keeps productivity high all afternoon',
      'Quick hydration break = better afternoon you',
    ],
    evening: [
      'Wind down with water. Your body will thank you',
      'Evening hydration for better sleep. Science says so',
      'Almost bedtime. One more glass to close out strong',
      'Your kidneys work the night shift. Give them what they need',
    ],
    urgent: [
      'Time for a hydration boost!',
      'Your body would love some water right now',
      'Perfect moment for a water break!',
      'A glass of water would feel amazing right now',
    ],
  },
  nutrition: {
    breakfast: [
      'Breakfast thoughts? Your metabolism is ready',
      'Morning fuel check: have you eaten yet?',
      'Your brain runs on breakfast. What\'s on the menu?',
      'Early nutrition = better energy all day',
    ],
    lunch: [
      'Lunch o\'clock! What\'s fueling your afternoon?',
      'Midday meal check: your energy levels are curious',
      'Lunch break = log break. 10 seconds to document',
      'Your afternoon productivity starts with what you eat now',
    ],
    dinner: [
      'Dinner time! What\'s on the plate tonight?',
      'Evening meal incoming. Your tracker is ready',
      'Last meal of the day. Make it count!',
      'Dinner: the final boss of daily nutrition',
    ],
    protein: [
      'Protein check: your muscles would love some fuel',
      'Great time to add some protein!',
      'Protein boost opportunity!',
      'Gains love protein. Just saying.',
    ],
  },
  activity: {
    morning: [
      'Movement before the day gets chaotic?',
      'Morning motion sets the tone. What\'s your move?',
      'Your body woke up ready to move. Are you?',
      'Early activity = energy all day. The science is clear',
    ],
    afternoon: [
      'Boost your afternoon energy with some movement!',
      'Your body would love a quick stretch right now',
      'Quick movement break = better focus',
      'A short walk could supercharge your afternoon',
    ],
    evening: [
      'Still time for some movement today',
      'Evening activity for better sleep. Win-win',
      'A few more steps would feel great!',
      'Squeeze in some movement before the day ends',
    ],
    urgent: [
      'Great time for some movement!',
      'Your body would love some activity right now',
      'Even a quick stretch would feel amazing!',
    ],
  },
  mood: {
    morning: [
      'Quick morning vibe check?',
      'How\'s the morning mood? 5 seconds to log',
      'Starting fresh? Capture that morning energy',
    ],
    afternoon: [
      'Midday mood check: how are we doing?',
      'Afternoon feelings check-in',
      'Quick emotional pulse? Your data wants to know',
    ],
    evening: [
      'Evening reflection: how was today?',
      'Day almost done. Mood capture time?',
      'Quick vibe log before bed?',
    ],
  },
};

// ============== ENGAGEMENT MESSAGES ==============
// User lifecycle-based messaging

export const engagementMessages = {
  newUser: [
    'Welcome! Every journey starts with a single log',
    'First steps matter. Let\'s build something great',
    'New here? We\'re excited to learn your patterns',
  ],
  returning: [
    'Welcome back! Your data missed you',
    'You\'re back! Ready to pick up where we left off?',
    'The return of a champion! Let\'s go',
  ],
  powerUser: [
    'Another day, another data point. You\'re elite',
    'Consistency royalty reporting for duty',
    'The algorithm recognizes dedication when it sees it',
  ],
  atRisk: [
    'Hey! We\'d love to see you again',
    'Your insights are ready when you are',
    'One log is all it takes to pick up where you left off',
  ],
};

// ============== PATTERN MESSAGES ==============
// For discovered correlations

export const patternMessages = {
  positive: [
    'Pattern detected! This is working for you',
    'The data is clear: keep doing this',
    'Positive correlation found! More of this, please',
    'Your body is responding well to this habit',
  ],
  negative: [
    'Here\'s an opportunity to optimize this habit',
    'This pattern has room for improvement',
    'Small adjustment here could make a big difference',
  ],
  neutral: [
    'Still gathering data on this pattern',
    'More logs needed to confirm this trend',
    'Interesting pattern emerging. Stay tuned',
  ],
  discoveries: [
    'We noticed you eat healthier on Mondays. Interesting...',
    'Your lunch choices predict your afternoon mood. Science!',
    'High protein days = better energy for you. Pattern confirmed',
    'Morning protein = better focus for you. We did the math',
    'Your best mood days? Also your highest fiber days. Connection?',
    'Your mood improves after morning walks. Not a coincidence',
    'Hydration and mood are connected for you. The data is clear',
    'Evening workouts boost your next-day mood. We noticed.',
    'Post-workout = happier you. The correlation is real',
  ],
};

// ============== GAMIFICATION MESSAGES ==============
// Level up, XP, achievements, and progression

export const gamificationMessages = {
  // Level up celebrations
  levelUp: (newLevel, levelName) => {
    const templates = [
      (l, n) => `LEVEL ${l}! You're now a ${n || 'Wellness Pro'}! 🎉`,
      (l, n) => `Level up! Welcome to Level ${l}: ${n || 'New Heights'}`,
      (l) => `You hit Level ${l}! The grind is paying off 💪`,
      (l, n) => `${n || `Level ${l}`} unlocked! You're evolving`,
      (l) => `Level ${l} achieved! Your dedication is legendary`,
      (l, n) => `Boom! Level ${l}! ${n || 'Elite status'} incoming`,
      (l) => `Level ${l}! You're literally getting better every day`,
      (l, n) => `Welcome to Level ${l}! ${n || 'Greatness awaits'}`,
    ];
    const selected = pick(templates, 'gamification.levelUp');
    return selected(newLevel, levelName);
  },

  // XP earned messages (for small XP gains)
  xpEarned: (amount, action) => {
    const templates = [
      (xp) => `+${xp} XP! Every point counts`,
      (xp) => `${xp} XP earned! Progress is progress`,
      (xp, a) => `+${xp} XP for ${a || 'being awesome'}!`,
      (xp) => `${xp} XP added! The grind continues`,
      (xp) => `+${xp} XP! Leveling up, one action at a time`,
      (xp) => `${xp} more XP in the bank! 📈`,
      (xp, a) => `Nice! ${xp} XP from ${a || 'that action'}`,
      (xp) => `+${xp} XP! Your XP bar is filling up`,
    ];
    const selected = pick(templates, 'gamification.xpEarned');
    return selected(amount, action);
  },

  // XP bonus messages (for multipliers, bonuses)
  xpBonus: (amount, reason) => {
    const templates = [
      (xp, r) => `BONUS: +${xp} XP! ${r || 'Extra credit!'}`,
      (xp) => `${xp} bonus XP! You're on fire 🔥`,
      (xp, r) => `+${xp} XP bonus from ${r || 'your streak'}!`,
      (xp) => `Jackpot! ${xp} bonus XP earned`,
      (xp, r) => `${r || 'Streak'} bonus: +${xp} XP!`,
    ];
    const selected = pick(templates, 'gamification.xpBonus');
    return selected(amount, reason);
  },

  // Achievement unlocked
  achievementUnlocked: (name, description) => {
    const templates = [
      (n) => `Achievement Unlocked: ${n}! 🏆`,
      (n) => `NEW ACHIEVEMENT: ${n}! You legend`,
      (n, d) => `${n} achieved! ${d || 'Another badge of honor'}`,
      (n) => `You unlocked "${n}"! Trophy case growing`,
      (n) => `🎊 ${n} complete! Achievement hunter status`,
      (n, d) => `Achievement: ${n}! ${d || 'Incredible work'}`,
      (n) => `"${n}" is now yours! Flex it proudly`,
      (n) => `${n} unlocked! Your collection grows`,
    ];
    const selected = pick(templates, 'gamification.achievementUnlocked');
    return selected(name, description);
  },

  // Badge earned
  badgeEarned: (badgeName, tier) => {
    const templates = [
      (b, t) => `${t || ''} ${b} badge earned! 🥇`,
      (b) => `New badge: ${b}! Pin it with pride`,
      (b, t) => `${b} (${t || 'Bronze'}) is yours!`,
      (b) => `Badge unlocked: ${b}! Your profile just leveled up`,
      (b, t) => `${t || 'New'} ${b} badge added to your collection`,
    ];
    const selected = pick(templates, 'gamification.badgeEarned');
    return selected(badgeName, tier);
  },

  // Tier upgrade (Bronze → Silver → Gold → Platinum → Diamond)
  tierUpgrade: (newTier, badgeName) => {
    const tierEmojis = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '💠',
    };
    const emoji = tierEmojis[newTier?.toLowerCase()] || '⭐';
    const templates = [
      (t, b) => `${emoji} Upgraded to ${t} ${b || 'tier'}!`,
      (t, b) => `${t} tier unlocked for ${b || 'this badge'}! ${emoji}`,
      (t) => `You're now ${t}! Keep climbing ${emoji}`,
      (t, b) => `${b || 'Badge'} upgraded to ${t}! Shiny ${emoji}`,
      (t) => `Welcome to ${t} tier! The view is better up here ${emoji}`,
    ];
    const selected = pick(templates, 'gamification.tierUpgrade');
    return selected(newTier, badgeName);
  },

  // Daily challenge completed
  challengeCompleted: (challengeName) => {
    const templates = [
      (c) => `Challenge "${c || 'Daily'}" crushed! 🎯`,
      () => `Daily challenge: complete! Extra XP secured`,
      (c) => `${c || 'Challenge'} done! You're on a roll`,
      () => `Another challenge conquered! Champion energy`,
      (c) => `${c || 'Mission'} accomplished! Nice work`,
    ];
    const selected = pick(templates, 'gamification.challengeCompleted');
    return selected(challengeName);
  },

  // Weekly goal completed
  weeklyGoalCompleted: (goalName) => {
    const templates = [
      () => `Weekly goal achieved! Consistency is your superpower 🏆`,
      (g) => `${g || 'Weekly goal'} complete! Week = dominated`,
      () => `Another week, another goal crushed. You\'re unstoppable`,
      (g) => `${g || 'This week\'s goal'}: done and dusted!`,
      () => `Weekly milestone reached! Future you is grateful`,
    ];
    const selected = pick(templates, 'gamification.weeklyGoalCompleted');
    return selected(goalName);
  },

  // Close to level up
  almostLevelUp: (xpNeeded) => {
    const templates = [
      (xp) => `Only ${xp} XP to level up! So close!`,
      (xp) => `${xp} XP away from the next level. You got this!`,
      (xp) => `Almost there! ${xp} more XP and you level up`,
      (xp) => `Level up incoming! Just ${xp} XP to go`,
      (xp) => `${xp} XP stands between you and greatness`,
    ];
    const selected = pick(templates, 'gamification.almostLevelUp');
    return selected(xpNeeded);
  },

  // Close to achievement
  almostAchievement: (achievementName, remaining) => {
    const templates = [
      (a, r) => `${r} more to unlock "${a}"!`,
      (a) => `So close to "${a}"! Keep pushing`,
      (a, r) => `"${a}" is ${r} away. You're almost there!`,
      (a) => `Nearly unlocked: ${a}. Don't stop now!`,
    ];
    const selected = pick(templates, 'gamification.almostAchievement');
    return selected(achievementName, remaining);
  },

  // Leaderboard messages
  leaderboard: {
    rankUp: (newRank) => pick([
      `You climbed to #${newRank}! The competition is real`,
      `Rank #${newRank}! Moving up in the world`,
      `New rank: #${newRank}. Others are watching`,
      `You're now #${newRank}! Elite company`,
    ], 'gamification.leaderboard.rankUp'),

    topPercent: (percent) => pick([
      `You're in the top ${percent}%! Absolute legend`,
      `Top ${percent}% of all users! Elite status confirmed`,
      `Better than ${100 - percent}% of users. Flex-worthy`,
    ], 'gamification.leaderboard.topPercent'),
  },

  // First time achievements (special)
  firstTime: {
    firstLog: () => pick([
      'First log ever! Your journey begins 🚀',
      'Log #1 in the books! Here we go',
      'First entry! The first of many, we hope',
      'It begins! First log captured',
    ], 'gamification.firstTime.firstLog'),

    firstStreak: () => pick([
      'First streak started! Day 1 of greatness',
      'Streak: activated! The chain begins',
      'Day 1! Your first streak is born',
    ], 'gamification.firstTime.firstStreak'),

    firstGoal: () => pick([
      'First goal set! Aim high, friend',
      'Goal #1 established! Let\'s crush it',
      'Your first target is locked in!',
    ], 'gamification.firstTime.firstGoal'),

    firstAchievement: () => pick([
      'Your first achievement! Many more to come 🏆',
      'Achievement unlocked! Welcome to the club',
      'First badge earned! Your collection begins',
    ], 'gamification.firstTime.firstAchievement'),
  },
};

export default {
  hydration: hydrationMessages,
  mood: moodMessages,
  food: foodMessages,
  activity: activityMessages,
  streak: streakMessages,
  goals: goalMessages,
  insights: insightMessages,
  general: generalMessages,
  reminders: reminderMessages,
  engagement: engagementMessages,
  patterns: patternMessages,
  gamification: gamificationMessages,
};
