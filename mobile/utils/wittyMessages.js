/**
 * Witty Messages - Zomato-style playful notifications
 *
 * Because "Success" is boring and we're better than that.
 */

// Helper to pick random from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============== HYDRATION ==============
export const hydrationMessages = {
  logged: (amount, type = 'water') => {
    const waterMessages = [
      `${amount}ml down! Your cells are throwing a party 🎉`,
      `Splash! ${amount}ml logged. Hydration game: strong`,
      `${amount}ml of H2-Ohhhh yeah!`,
      `Glug glug! ${amount}ml added. Your body says thanks`,
      `${amount}ml closer to glowing skin status`,
      `Water logged! ${amount}ml of pure refreshment`,
      `${amount}ml secured. Dehydration? Don't know her`,
      `Hydration station! ${amount}ml checked in`,
    ];

    const coffeeMessages = [
      `${amount}ml of liquid ambition logged ☕`,
      `Caffeine delivery confirmed! ${amount}ml of go-juice`,
      `Coffee break documented. Productivity incoming!`,
      `Brew-tiful! ${amount}ml of bean magic`,
      `${amount}ml of "don't talk to me yet" juice`,
      `Coffee logged! Your future self is grateful`,
    ];

    const teaMessages = [
      `${amount}ml of zen in a cup 🍵`,
      `Tea time logged! Serenity achieved`,
      `Steeped and noted. ${amount}ml of calm`,
      `${amount}ml of cozy vibes secured`,
      `Tea logged! Sophisticated choice, friend`,
    ];

    const juiceMessages = [
      `${amount}ml of fruity goodness! 🍊`,
      `Juice logged! Vitamin party started`,
      `${amount}ml of liquid sunshine`,
    ];

    const milkMessages = [
      `${amount}ml of calcium goodness 🥛`,
      `Milk logged! Strong bones incoming`,
      `Got milk? You sure do! ${amount}ml`,
    ];

    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('coffee') || lowerType.includes('espresso')) return pick(coffeeMessages);
    if (lowerType.includes('tea')) return pick(teaMessages);
    if (lowerType.includes('juice') || lowerType.includes('smoothie')) return pick(juiceMessages);
    if (lowerType.includes('milk')) return pick(milkMessages);
    return pick(waterMessages);
  },

  removed: () => pick([
    'Entry yeeted! We all make mistakes',
    'Poof! That entry never happened',
    'Deleted. What entry? 👀',
    'Gone! Your hydration history is rewritten',
  ]),

  goalReached: () => pick([
    'HYDRATION GOAL CRUSHED! Your kidneys are grateful 💧',
    'Goal achieved! You beautiful hydrated legend',
    'Water champion of the day right here! 🏆',
    '100% hydrated! Your skin is glowing already',
    'Goal smashed! Dehydration has left the chat',
  ]),
};

// ============== MOOD ==============
export const moodMessages = {
  logged: (mood) => {
    const happyMessages = [
      'Good vibes documented! 😊',
      'Happiness logged. Keep radiating!',
      'Your joy has been noted. Contagious!',
      'Smiles per hour: high! Logged it',
      'Happy logged! Your positivity is showing',
    ];

    const calmMessages = [
      'Zen mode: activated 😌',
      'Calm logged. Inner peace unlocked',
      'Serenity noted. You peaceful human',
      'Calm vibes captured. Namaste!',
      'Logged! Your calm energy is goals',
    ];

    const focusedMessages = [
      'Focus mode: engaged 🎯',
      'Laser focus logged! Get it done',
      'Concentration documented. Unstoppable!',
      'In the zone! Focus level: elite',
      'Logged! Productivity mode activated',
    ];

    const energizedMessages = [
      'Energy levels: OFF THE CHARTS ⚡',
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
      'Energy levels: recharge needed',
      'Tired logged. Permission to nap granted',
      'Low battery noted. Self-care time?',
      'Tiredness documented. You deserve rest',
    ];

    const stressedMessages = [
      'Stress noted. Deep breaths, friend 💨',
      'Logged. This too shall pass',
      'Stress captured. Have you tried tea?',
      'Overwhelm documented. One thing at a time',
      'Logged with empathy. You got this',
    ];

    const sadMessages = [
      'Noted with care. Sending virtual hugs 🤗',
      'Logged. Tomorrow is a fresh page',
      'Sadness documented. It\'s okay to feel',
      'We see you. Better days are coming',
      'Logged. Your feelings are valid',
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

    return pick(moodMap[mood] || [
      'Mood captured! 📝',
      'Feeling noted. Self-awareness level: pro',
      'Logged! Emotional intelligence: unlocked',
      'Mood documented. You reflective human',
    ]);
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
  ]),

  quickAdded: (foodName) => pick([
    `${foodName} added in a flash! ⚡`,
    `Quick add: ${foodName}. Speed demon!`,
    `${foodName} logged. That was fast!`,
    `Boom! ${foodName} documented`,
    `${foodName} captured. Efficiency: maximum`,
  ]),

  savedMealLoaded: (name) => pick([
    `"${name}" loaded. Smart choice! 🧠`,
    `${name} ready to log. Efficiency mode: ON`,
    `Loaded "${name}". Past you was clever`,
    `${name} queued up! One-tap logging FTW`,
  ]),

  analyzed: () => pick([
    'AI magic complete! ✨',
    'Nutrition decoded! Science is cool',
    'Food analyzed. Data acquired!',
    'Analysis complete! Knowledge is power',
    'Nutrition breakdown ready! 🔬',
  ]),

  readyToLog: (mealType) => pick([
    `Ready to capture some ${mealType || 'food'}! 📸`,
    `${mealType || 'Meal'} logging mode: activated`,
    `Let's log that ${mealType || 'deliciousness'}!`,
    `${mealType || 'Food'} tracker standing by!`,
  ]),
};

// ============== ACTIVITY ==============
export const activityMessages = {
  logged: (minutes, type) => pick([
    `${minutes} mins of ${type || 'movement'}! Crushing it 💪`,
    `Movement logged! Your body thanks you`,
    `${minutes} minutes well spent. Future you is grateful`,
    `Active minutes secured! Endorphins: released`,
    `${minutes} mins of ${type || 'activity'} documented. Beast mode!`,
    `Workout logged! Gains incoming 📈`,
    `${minutes} minutes of awesome captured`,
    `Activity noted! Couch: defeated`,
  ]),
};

// ============== STREAK ==============
export const streakMessages = {
  continued: (days) => pick([
    `${days} days strong! Unstoppable 🔥`,
    `Day ${days}! You're absolutely on fire`,
    `Streak extended to ${days}! Living legend`,
    `${days} day streak! Consistency is your superpower`,
    `Day ${days} crushed! Who even are you?!`,
    `${days} days and counting! Dedication: elite`,
  ]),

  freezeEarned: () => pick([
    'Streak freeze earned! Insurance secured 🛡️',
    'New streak freeze unlocked! Safety first',
    'Safety net acquired. Smart cookie!',
    'Freeze unlocked! Your streak is protected',
    'Backup plan secured! Well played',
  ]),

  milestone: (days) => pick([
    `${days} DAYS! You absolute legend! 🎉`,
    `Milestone: ${days} days! Hall of fame material`,
    `${days} day streak! This calls for celebration`,
    `WOW! ${days} days! Take a bow 🏆`,
  ]),
};

// ============== GOALS ==============
export const goalMessages = {
  updated: () => pick([
    'Goal updated! Aim high, friend',
    'New target locked in!',
    'Goal set. Let\'s crush it!',
    'Updated! Your ambition is noted',
  ]),

  reached: (goalType) => pick([
    `${goalType || 'Goal'} achieved! Victory dance time`,
    `You did it! ${goalType || 'Goal'} complete`,
    `${goalType || 'Target'} crushed! What\'s next?`,
  ]),
};

// ============== INSIGHTS ==============
export const insightMessages = {
  patternDismissed: () => pick([
    'Pattern dismissed. We\'ll do better!',
    'Noted! Not all patterns are keepers',
    'Dismissed. Thanks for keeping us honest!',
  ]),

  noInsights: () => pick([
    'No insights yet. Keep logging!',
    'Insights are brewing. Check back soon!',
    'Need more data to work with here',
  ]),

  shareError: () => pick([
    'Couldn\'t share right now. Try again?',
    'Sharing hiccup! Give it another shot',
    'The share button is being shy. Retry?',
  ]),

  savedForLater: () => pick([
    'Saved for later! Smart move',
    'Bookmarked! Your future self will thank you',
    'Noted for later. Organizational skills: 100',
  ]),

  actionTip: (action) => action || pick([
    'Pro tip noted!',
    'Good advice incoming!',
    'Wisdom unlocked!',
  ]),
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
  ]),

  error: () => pick([
    'Oops! Something went sideways 😅',
    'Hmm, that didn\'t work. Try again?',
    'Error! But we believe in second chances',
    'Glitch in the matrix. One more time?',
    'Technical hiccup! Let\'s try that again',
    'Something broke. Not your fault though!',
  ]),

  feedbackThanks: () => pick([
    'Thanks for the feedback! 🙏',
    'Noted! Your input makes us better',
    'Feedback received. You rock!',
    'Thanks! Every bit helps us improve',
    'Heard! Your voice matters here',
  ]),

  reportThanks: () => pick([
    'Thanks! Our team will review this 👀',
    'Report received. We\'re on it!',
    'Flagged for review. Thanks for helping!',
    'Noted! We\'ll look into this',
    'Thanks for keeping us honest!',
  ]),
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
};
