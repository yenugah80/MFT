/**
 * Nutrition Estimation Prompts
 *
 * Philosophy: Accurate estimation with explicit uncertainty handling.
 * - Chain-of-thought reasoning for complex foods
 * - Disambiguation when ambiguous
 * - Self-validation with Atwater factors
 * - Explicit "I don't know" option for unknown foods
 * - Calibrated confidence scoring
 *
 * ARCHITECTURE:
 * - Simple foods (single ingredient) → Direct estimation
 * - Complex foods (multi-ingredient) → CoT reasoning then estimation
 * - Ambiguous foods → Disambiguation protocol
 * - Unknown foods → Explicit uncertainty with best-effort estimate
 */

// ==================== CONSTANTS ====================

/**
 * Known homonyms that require disambiguation
 */
const HOMONYMS = {
  'buffalo': ['buffalo chicken wings', 'buffalo (bison) meat', 'buffalo mozzarella'],
  'chips': ['potato chips (US)', 'french fries (UK)', 'tortilla chips'],
  'biscuit': ['American biscuit (bread)', 'British biscuit (cookie)'],
  'jelly': ['fruit jelly/jam', 'gelatin dessert (Jell-O)'],
  'cider': ['apple cider (non-alcoholic)', 'hard cider (alcoholic)'],
  'pudding': ['American pudding (custard)', 'British pudding (dessert/cake)'],
  'squash': ['squash vegetable', 'squash drink (UK)'],
  'roll': ['bread roll', 'sushi roll', 'spring roll', 'egg roll'],
  'wrap': ['tortilla wrap', 'lettuce wrap', 'rice paper wrap'],
};

/**
 * Common abbreviations to expand
 */
const ABBREVIATIONS = {
  'pbj': 'peanut butter and jelly sandwich',
  'pb&j': 'peanut butter and jelly sandwich',
  'blt': 'bacon lettuce tomato sandwich',
  'oj': 'orange juice',
  'pb': 'peanut butter',
  'evoo': 'extra virgin olive oil',
  'mac n cheese': 'macaroni and cheese',
  'mac & cheese': 'macaroni and cheese',
  'grilled cheese': 'grilled cheese sandwich',
  't-bone': 't-bone steak',
  'nyc style pizza': 'new york style pizza slice',
};

/**
 * Vague quantity mappings to standard portions
 */
const VAGUE_QUANTITIES = {
  'a few': { multiplier: 3, note: '"a few" interpreted as 3 pieces' },
  'some': { multiplier: 1, note: '"some" interpreted as 1 standard serving' },
  'a little': { multiplier: 0.5, note: '"a little" interpreted as half serving' },
  'a bit': { multiplier: 0.5, note: '"a bit" interpreted as half serving' },
  'generous': { multiplier: 1.5, note: '"generous" interpreted as 1.5x standard serving' },
  'small': { multiplier: 0.75, note: '"small" interpreted as 0.75x standard serving' },
  'large': { multiplier: 1.5, note: '"large" interpreted as 1.5x standard serving' },
  'extra large': { multiplier: 2, note: '"extra large" interpreted as 2x standard serving' },
  'handful': { multiplier: 1, note: '"handful" interpreted as ~30g for nuts/snacks' },
  'big': { multiplier: 1.5, note: '"big" interpreted as 1.5x standard serving' },
  'tiny': { multiplier: 0.25, note: '"tiny" interpreted as 0.25x standard serving' },
};

/**
 * Negation patterns - these REMOVE or ZERO OUT components
 */
const NEGATION_PATTERNS = [
  { pattern: /without\s+(\w+)/gi, action: 'remove' },
  { pattern: /no\s+(\w+)/gi, action: 'remove' },
  { pattern: /hold\s+the\s+(\w+)/gi, action: 'remove' },
  { pattern: /skip\s+(\w+)/gi, action: 'remove' },
  { pattern: /minus\s+(\w+)/gi, action: 'remove' },
  { pattern: /less\s+(\w+)/gi, action: 'reduce' },
  { pattern: /light\s+(\w+)/gi, action: 'reduce' },
  { pattern: /low[- ]?(\w+)/gi, action: 'reduce' },
];

/**
 * Addition patterns - these INCREASE components
 */
const ADDITION_PATTERNS = [
  { pattern: /extra\s+(\w+)/gi, multiplier: 1.5 },
  { pattern: /double\s+(\w+)/gi, multiplier: 2 },
  { pattern: /triple\s+(\w+)/gi, multiplier: 3 },
  { pattern: /added\s+(\w+)/gi, multiplier: 1.25 },
  { pattern: /with\s+extra\s+(\w+)/gi, multiplier: 1.5 },
];

/**
 * Preparation context adjustments
 */
const PREPARATION_ADJUSTMENTS = {
  'homemade': { fatMultiplier: 1.0, sodiumMultiplier: 0.8, note: 'Homemade - typical home cooking' },
  'restaurant': { fatMultiplier: 1.3, sodiumMultiplier: 1.4, note: 'Restaurant - typically higher fat/sodium' },
  'fast_food': { fatMultiplier: 1.5, sodiumMultiplier: 1.6, note: 'Fast food - significantly higher fat/sodium' },
  'fine_dining': { fatMultiplier: 1.4, sodiumMultiplier: 1.2, note: 'Fine dining - butter/cream heavy' },
  'takeout': { fatMultiplier: 1.25, sodiumMultiplier: 1.3, note: 'Takeout - moderately higher fat/sodium' },
};

/**
 * Known brand name foods with approximate nutrition
 * These override generic estimates when detected
 */
const BRAND_FOODS = {
  // Fast Food Burgers
  'big mac': { calories: 550, protein: 25, carbs: 45, fat: 30, sodium: 1010, brand: "McDonald's" },
  'whopper': { calories: 657, protein: 28, carbs: 49, fat: 40, sodium: 980, brand: 'Burger King' },
  'baconator': { calories: 950, protein: 57, carbs: 38, fat: 62, sodium: 1800, brand: "Wendy's" },
  'quarter pounder': { calories: 520, protein: 30, carbs: 42, fat: 26, sodium: 1100, brand: "McDonald's" },
  'double double': { calories: 670, protein: 37, carbs: 39, fat: 41, sodium: 1440, brand: 'In-N-Out' },

  // Fast Food Chicken
  'mcchicken': { calories: 400, protein: 14, carbs: 40, fat: 21, sodium: 560, brand: "McDonald's" },
  'spicy chicken sandwich': { calories: 450, protein: 28, carbs: 44, fat: 19, sodium: 1620, brand: 'Chick-fil-A' },
  'popcorn chicken': { calories: 290, protein: 14, carbs: 17, fat: 19, sodium: 760, brand: 'KFC' },

  // Coffee Drinks (grande/medium size)
  'pumpkin spice latte': { calories: 380, protein: 14, carbs: 52, fat: 14, sodium: 240, brand: 'Starbucks' },
  'caramel macchiato': { calories: 250, protein: 10, carbs: 35, fat: 7, sodium: 150, brand: 'Starbucks' },
  'mocha frappuccino': { calories: 370, protein: 5, carbs: 52, fat: 15, sodium: 220, brand: 'Starbucks' },
  'vanilla latte': { calories: 250, protein: 12, carbs: 37, fat: 6, sodium: 150, brand: 'Starbucks' },

  // Pizzas (per slice)
  'dominos pepperoni': { calories: 290, protein: 12, carbs: 34, fat: 12, sodium: 670, brand: "Domino's", unit: 'slice' },
  'pizza hut pepperoni': { calories: 300, protein: 13, carbs: 30, fat: 14, sodium: 720, brand: 'Pizza Hut', unit: 'slice' },

  // Tacos
  'crunchy taco': { calories: 170, protein: 8, carbs: 13, fat: 10, sodium: 310, brand: 'Taco Bell' },
  'burrito supreme': { calories: 400, protein: 16, carbs: 51, fat: 14, sodium: 1090, brand: 'Taco Bell' },
  'chipotle burrito': { calories: 1070, protein: 46, carbs: 114, fat: 43, sodium: 2130, brand: 'Chipotle' },

  // Subs/Sandwiches
  'footlong sub': { calories: 580, protein: 23, carbs: 96, fat: 9, sodium: 1240, brand: 'Subway', note: 'Turkey breast' },
  'italian bmt': { calories: 820, protein: 36, carbs: 92, fat: 35, sodium: 2480, brand: 'Subway', unit: 'footlong' },

  // Panera Bread
  'panera mac and cheese': { calories: 980, protein: 34, carbs: 89, fat: 53, sodium: 1840, brand: 'Panera Bread' },
  'panera broccoli cheddar soup': { calories: 360, protein: 13, carbs: 30, fat: 21, sodium: 1190, brand: 'Panera Bread', unit: 'bowl' },
  'panera broccoli cheddar bread bowl': { calories: 900, protein: 35, carbs: 114, fat: 35, sodium: 1850, brand: 'Panera Bread' },
  'panera caesar salad': { calories: 330, protein: 8, carbs: 14, fat: 27, sodium: 600, brand: 'Panera Bread', unit: 'half' },
  'panera green goddess salad': { calories: 520, protein: 26, carbs: 35, fat: 31, sodium: 680, brand: 'Panera Bread' },
  'panera mediterranean bowl': { calories: 520, protein: 16, carbs: 56, fat: 27, sodium: 1110, brand: 'Panera Bread' },
  'panera baja bowl': { calories: 640, protein: 30, carbs: 57, fat: 33, sodium: 1380, brand: 'Panera Bread' },
  'panera frontega chicken': { calories: 860, protein: 41, carbs: 76, fat: 42, sodium: 1690, brand: 'Panera Bread' },
  'panera turkey avocado': { calories: 720, protein: 32, carbs: 62, fat: 38, sodium: 1320, brand: 'Panera Bread' },
  'panera bacon turkey bravo': { calories: 650, protein: 37, carbs: 52, fat: 32, sodium: 1790, brand: 'Panera Bread' },
  'panera fuji apple salad': { calories: 550, protein: 31, carbs: 40, fat: 31, sodium: 870, brand: 'Panera Bread' },
  'panera strawberry poppyseed salad': { calories: 350, protein: 29, carbs: 30, fat: 12, sodium: 690, brand: 'Panera Bread' },

  // More McDonald's
  'mcnuggets 10 piece': { calories: 420, protein: 25, carbs: 26, fat: 25, sodium: 900, brand: "McDonald's" },
  'mcnuggets 6 piece': { calories: 250, protein: 15, carbs: 15, fat: 15, sodium: 540, brand: "McDonald's" },
  'egg mcmuffin': { calories: 310, protein: 17, carbs: 30, fat: 13, sodium: 770, brand: "McDonald's" },
  'sausage mcmuffin': { calories: 400, protein: 14, carbs: 29, fat: 26, sodium: 780, brand: "McDonald's" },
  'filet o fish': { calories: 390, protein: 16, carbs: 39, fat: 19, sodium: 580, brand: "McDonald's" },
  'mcflurry oreo': { calories: 510, protein: 13, carbs: 80, fat: 17, sodium: 280, brand: "McDonald's" },
  'mcdouble': { calories: 400, protein: 22, carbs: 33, fat: 20, sodium: 920, brand: "McDonald's" },
  'large fries': { calories: 490, protein: 7, carbs: 66, fat: 23, sodium: 400, brand: "McDonald's" },
  'medium fries': { calories: 320, protein: 5, carbs: 43, fat: 15, sodium: 260, brand: "McDonald's" },

  // More Subway
  'subway meatball marinara': { calories: 960, protein: 44, carbs: 108, fat: 38, sodium: 2220, brand: 'Subway', unit: 'footlong' },
  'subway chicken teriyaki': { calories: 600, protein: 44, carbs: 94, fat: 8, sodium: 1800, brand: 'Subway', unit: 'footlong' },
  'subway veggie delite': { calories: 420, protein: 16, carbs: 82, fat: 4, sodium: 640, brand: 'Subway', unit: 'footlong' },
  'subway tuna': { calories: 960, protein: 40, carbs: 86, fat: 50, sodium: 1520, brand: 'Subway', unit: 'footlong' },
  'subway steak and cheese': { calories: 720, protein: 48, carbs: 90, fat: 18, sodium: 2000, brand: 'Subway', unit: 'footlong' },

  // More Domino's (per slice, hand-tossed medium)
  'dominos cheese pizza': { calories: 200, protein: 8, carbs: 25, fat: 8, sodium: 470, brand: "Domino's", unit: 'slice' },
  'dominos supreme': { calories: 280, protein: 11, carbs: 28, fat: 14, sodium: 660, brand: "Domino's", unit: 'slice' },
  'dominos meat lovers': { calories: 310, protein: 13, carbs: 26, fat: 17, sodium: 750, brand: "Domino's", unit: 'slice' },
  'dominos buffalo chicken': { calories: 240, protein: 11, carbs: 27, fat: 10, sodium: 610, brand: "Domino's", unit: 'slice' },
  'dominos breadsticks': { calories: 110, protein: 2, carbs: 12, fat: 6, sodium: 140, brand: "Domino's", unit: 'stick' },
  'dominos chicken wings': { calories: 200, protein: 17, carbs: 2, fat: 14, sodium: 750, brand: "Domino's", unit: '4 wings' },

  // Chick-fil-A
  'chick fil a sandwich': { calories: 440, protein: 28, carbs: 40, fat: 19, sodium: 1350, brand: 'Chick-fil-A' },
  'chick fil a deluxe': { calories: 500, protein: 29, carbs: 42, fat: 23, sodium: 1640, brand: 'Chick-fil-A' },
  'chick fil a nuggets 12': { calories: 380, protein: 40, carbs: 13, fat: 18, sodium: 1680, brand: 'Chick-fil-A' },
  'chick fil a nuggets 8': { calories: 250, protein: 27, carbs: 9, fat: 12, sodium: 1120, brand: 'Chick-fil-A' },
  'chick fil a waffle fries': { calories: 420, protein: 5, carbs: 45, fat: 24, sodium: 240, brand: 'Chick-fil-A', unit: 'medium' },
  'chick fil a cobb salad': { calories: 510, protein: 41, carbs: 28, fat: 27, sodium: 1310, brand: 'Chick-fil-A' },
  'chick fil a milkshake': { calories: 580, protein: 14, carbs: 85, fat: 22, sodium: 470, brand: 'Chick-fil-A', unit: 'medium' },

  // Starbucks Food
  'starbucks bacon gouda': { calories: 370, protein: 19, carbs: 34, fat: 18, sodium: 750, brand: 'Starbucks' },
  'starbucks impossible sandwich': { calories: 420, protein: 22, carbs: 44, fat: 18, sodium: 830, brand: 'Starbucks' },
  'starbucks cake pop': { calories: 180, protein: 2, carbs: 24, fat: 9, sodium: 100, brand: 'Starbucks' },
  'starbucks croissant': { calories: 260, protein: 5, carbs: 28, fat: 14, sodium: 280, brand: 'Starbucks' },
  'starbucks cheese danish': { calories: 420, protein: 8, carbs: 45, fat: 23, sodium: 350, brand: 'Starbucks' },
  'starbucks egg bites': { calories: 310, protein: 19, carbs: 13, fat: 21, sodium: 600, brand: 'Starbucks', unit: '2 bites' },

  // Chipotle (more items)
  'chipotle bowl': { calories: 665, protein: 34, carbs: 72, fat: 27, sodium: 1380, brand: 'Chipotle', note: 'Chicken bowl with rice, beans' },
  'chipotle tacos': { calories: 565, protein: 32, carbs: 42, fat: 30, sodium: 1110, brand: 'Chipotle', unit: '3 tacos' },
  'chipotle quesadilla': { calories: 1180, protein: 58, carbs: 76, fat: 68, sodium: 2250, brand: 'Chipotle' },
  'chipotle chips and guac': { calories: 770, protein: 6, carbs: 67, fat: 54, sodium: 600, brand: 'Chipotle' },
  'chipotle carnitas bowl': { calories: 740, protein: 35, carbs: 72, fat: 34, sodium: 1520, brand: 'Chipotle' },

  // Five Guys
  'five guys cheeseburger': { calories: 840, protein: 47, carbs: 40, fat: 55, sodium: 1050, brand: 'Five Guys' },
  'five guys little cheeseburger': { calories: 550, protein: 27, carbs: 39, fat: 32, sodium: 690, brand: 'Five Guys' },
  'five guys fries': { calories: 953, protein: 15, carbs: 131, fat: 41, sodium: 962, brand: 'Five Guys', unit: 'regular' },
  'five guys cajun fries': { calories: 953, protein: 15, carbs: 131, fat: 41, sodium: 1460, brand: 'Five Guys', unit: 'regular' },
  'five guys hot dog': { calories: 545, protein: 18, carbs: 40, fat: 35, sodium: 1130, brand: 'Five Guys' },

  // Dunkin (Donuts & Coffee)
  'dunkin glazed donut': { calories: 260, protein: 4, carbs: 31, fat: 14, sodium: 330, brand: 'Dunkin' },
  'dunkin boston cream': { calories: 310, protein: 4, carbs: 42, fat: 15, sodium: 360, brand: 'Dunkin' },
  'dunkin chocolate frosted': { calories: 270, protein: 4, carbs: 32, fat: 15, sodium: 340, brand: 'Dunkin' },
  'dunkin croissant': { calories: 340, protein: 6, carbs: 36, fat: 19, sodium: 330, brand: 'Dunkin' },
  'dunkin medium iced coffee': { calories: 10, protein: 1, carbs: 2, fat: 0, sodium: 15, brand: 'Dunkin', note: 'unsweetened' },
  'dunkin medium latte': { calories: 120, protein: 8, carbs: 12, fat: 5, sodium: 135, brand: 'Dunkin' },

  // Panda Express
  'panda express orange chicken': { calories: 490, protein: 25, carbs: 51, fat: 23, sodium: 820, brand: 'Panda Express', unit: 'entree' },
  'panda express beijing beef': { calories: 480, protein: 16, carbs: 56, fat: 22, sodium: 680, brand: 'Panda Express', unit: 'entree' },
  'panda express kung pao chicken': { calories: 290, protein: 16, carbs: 14, fat: 19, sodium: 970, brand: 'Panda Express', unit: 'entree' },
  'panda express chow mein': { calories: 510, protein: 13, carbs: 80, fat: 16, sodium: 860, brand: 'Panda Express', unit: 'side' },
  'panda express fried rice': { calories: 520, protein: 11, carbs: 85, fat: 16, sodium: 850, brand: 'Panda Express', unit: 'side' },
};

/**
 * Bone-in vs boneless weight adjustments
 * Edible portion as percentage of total weight
 */
const BONE_ADJUSTMENTS = {
  'chicken thigh bone-in': { ediblePercent: 0.66, note: 'Bone-in chicken thigh - 66% edible' },
  'chicken leg bone-in': { ediblePercent: 0.60, note: 'Bone-in chicken leg - 60% edible' },
  'chicken wing bone-in': { ediblePercent: 0.45, note: 'Bone-in chicken wing - 45% edible' },
  't-bone steak': { ediblePercent: 0.82, note: 'T-bone steak - 82% edible (bone weight)' },
  'ribeye bone-in': { ediblePercent: 0.85, note: 'Bone-in ribeye - 85% edible' },
  'pork chop bone-in': { ediblePercent: 0.75, note: 'Bone-in pork chop - 75% edible' },
  'lamb chop': { ediblePercent: 0.70, note: 'Lamb chop - 70% edible' },
  'fish with bones': { ediblePercent: 0.50, note: 'Whole fish with bones - 50% edible' },
  'shrimp with shell': { ediblePercent: 0.55, note: 'Shrimp with shell - 55% edible' },
  'crab legs': { ediblePercent: 0.25, note: 'Crab legs - 25% edible (shell heavy)' },
};

/**
 * Sugar alcohol calorie values (for keto/diabetic foods)
 * Most sugar alcohols have reduced caloric impact
 */
const SUGAR_ALCOHOLS = {
  'erythritol': { kcalPerGram: 0, note: 'Erythritol - 0 kcal/g (not metabolized)' },
  'xylitol': { kcalPerGram: 2.4, note: 'Xylitol - 2.4 kcal/g' },
  'maltitol': { kcalPerGram: 2.1, note: 'Maltitol - 2.1 kcal/g' },
  'sorbitol': { kcalPerGram: 2.6, note: 'Sorbitol - 2.6 kcal/g' },
  'isomalt': { kcalPerGram: 2.0, note: 'Isomalt - 2.0 kcal/g' },
  'stevia': { kcalPerGram: 0, note: 'Stevia - 0 kcal (non-caloric sweetener)' },
  'monk fruit': { kcalPerGram: 0, note: 'Monk fruit - 0 kcal (non-caloric sweetener)' },
};

/**
 * Leftover/reheated food adjustments
 * Some foods change nutritionally when reheated
 */
const LEFTOVER_ADJUSTMENTS = {
  'reheated_rice': { note: 'Reheated rice has ~10% more resistant starch (slightly fewer digestible carbs)' },
  'reheated_pasta': { note: 'Reheated pasta has ~10% more resistant starch' },
  'reheated_potato': { note: 'Cooled/reheated potatoes have more resistant starch' },
  'leftover_pizza': { fatMultiplier: 1.0, note: 'Leftover pizza - same calories, may have absorbed more oil' },
  'leftover_fried': { fatMultiplier: 0.95, note: 'Leftover fried food - slightly less crispy, similar calories' },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * FIXED P1: Sanitize food query to prevent prompt injection
 * ENHANCED: Also expands abbreviations and detects homonyms
 * @private
 */
function sanitizeFoodQuery(query) {
  // FIXED #7: Remove injection patterns only, preserve valid parentheses
  let sanitized = query
    .replace(/ignore.*?instructions/gi, '')
    .replace(/system.*?prompt/gi, '')
    .replace(/previous.*?instruction/gi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/[\[\]\{\}\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim();
  }

  // Reject if became empty after sanitization
  if (sanitized.length === 0) {
    throw new Error('Food query is invalid after sanitization');
  }

  return sanitized;
}

/**
 * Expand known abbreviations in food query
 * @param {string} query - The food query
 * @returns {{ expanded: string, wasExpanded: boolean, original: string }}
 */
function expandAbbreviations(query) {
  const lowerQuery = query.toLowerCase().trim();

  for (const [abbr, expansion] of Object.entries(ABBREVIATIONS)) {
    if (lowerQuery === abbr || lowerQuery.startsWith(abbr + ' ') || lowerQuery.endsWith(' ' + abbr)) {
      return {
        expanded: query.toLowerCase().replace(new RegExp(`\\b${abbr}\\b`, 'gi'), expansion),
        wasExpanded: true,
        original: query,
        abbreviation: abbr,
        expandedTo: expansion
      };
    }
  }

  return { expanded: query, wasExpanded: false, original: query };
}

/**
 * Detect if query contains a known homonym requiring disambiguation
 * @param {string} query - The food query
 * @returns {{ needsDisambiguation: boolean, homonym: string|null, possibilities: string[] }}
 */
function detectHomonyms(query) {
  const lowerQuery = query.toLowerCase();

  for (const [homonym, possibilities] of Object.entries(HOMONYMS)) {
    // Check if the homonym appears as a standalone word
    const regex = new RegExp(`\\b${homonym}\\b`, 'i');
    if (regex.test(lowerQuery)) {
      // Check if context already disambiguates
      const hasContext = possibilities.some(p => {
        const contextWords = p.toLowerCase().split(/\s+/).filter(w => w !== homonym);
        return contextWords.some(w => lowerQuery.includes(w));
      });

      if (!hasContext) {
        return {
          needsDisambiguation: true,
          homonym,
          possibilities,
          clarifyingQuestion: `Did you mean: ${possibilities.join(' OR ')}?`
        };
      }
    }
  }

  return { needsDisambiguation: false, homonym: null, possibilities: [] };
}

/**
 * Parse vague quantities from query
 * @param {string} query - The food query
 * @returns {{ quantity: string, multiplier: number, note: string|null }}
 */
function parseVagueQuantity(query) {
  const lowerQuery = query.toLowerCase();

  for (const [vagueWord, config] of Object.entries(VAGUE_QUANTITIES)) {
    if (lowerQuery.includes(vagueWord)) {
      return {
        detected: true,
        vagueWord,
        multiplier: config.multiplier,
        note: config.note
      };
    }
  }

  return { detected: false, multiplier: 1, note: null };
}

/**
 * Parse negation modifiers from query
 * @param {string} query - The food query
 * @returns {{ hasNegation: boolean, removedItems: string[], reducedItems: string[] }}
 */
function parseNegationModifiers(query) {
  const removedItems = [];
  const reducedItems = [];

  for (const { pattern, action } of NEGATION_PATTERNS) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const item = match[1]?.toLowerCase();
      if (item) {
        if (action === 'remove') {
          removedItems.push(item);
        } else if (action === 'reduce') {
          reducedItems.push(item);
        }
      }
    }
  }

  return {
    hasNegation: removedItems.length > 0 || reducedItems.length > 0,
    removedItems: [...new Set(removedItems)],
    reducedItems: [...new Set(reducedItems)]
  };
}

/**
 * Parse addition modifiers from query
 * @param {string} query - The food query
 * @returns {{ hasAdditions: boolean, additions: Array<{item: string, multiplier: number}> }}
 */
function parseAdditionModifiers(query) {
  const additions = [];

  for (const { pattern, multiplier } of ADDITION_PATTERNS) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const item = match[1]?.toLowerCase();
      if (item) {
        additions.push({ item, multiplier });
      }
    }
  }

  return {
    hasAdditions: additions.length > 0,
    additions
  };
}

/**
 * Detect preparation context from query
 * @param {string} query - The food query
 * @returns {{ context: string, adjustments: object }}
 */
function detectPreparationContext(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('mcdonald') || lowerQuery.includes('burger king') ||
      lowerQuery.includes('wendy') || lowerQuery.includes('taco bell') ||
      lowerQuery.includes('kfc') || lowerQuery.includes('fast food')) {
    return { context: 'fast_food', adjustments: PREPARATION_ADJUSTMENTS.fast_food };
  }

  if (lowerQuery.includes('restaurant') || lowerQuery.includes('dine out') ||
      lowerQuery.includes('ate out')) {
    return { context: 'restaurant', adjustments: PREPARATION_ADJUSTMENTS.restaurant };
  }

  if (lowerQuery.includes('homemade') || lowerQuery.includes('home made') ||
      lowerQuery.includes('home cooked') || lowerQuery.includes('homecooked')) {
    return { context: 'homemade', adjustments: PREPARATION_ADJUSTMENTS.homemade };
  }

  if (lowerQuery.includes('takeout') || lowerQuery.includes('take out') ||
      lowerQuery.includes('delivery') || lowerQuery.includes('uber eats') ||
      lowerQuery.includes('doordash')) {
    return { context: 'takeout', adjustments: PREPARATION_ADJUSTMENTS.takeout };
  }

  // Default to homemade if no context detected
  return { context: 'unknown', adjustments: null };
}

/**
 * Detect if query matches a known brand name food
 * @param {string} query - The food query
 * @returns {{ isBrandFood: boolean, brandData: object|null, brand: string|null }}
 */
function detectBrandFood(query) {
  const lowerQuery = query.toLowerCase().trim();

  for (const [brandFood, data] of Object.entries(BRAND_FOODS)) {
    if (lowerQuery.includes(brandFood)) {
      return {
        isBrandFood: true,
        brandFood,
        brandData: data,
        brand: data.brand,
      };
    }
  }

  return { isBrandFood: false, brandData: null, brand: null };
}

/**
 * Detect bone-in foods and calculate edible portion
 * @param {string} query - The food query
 * @param {number} totalWeight - Total weight in grams
 * @returns {{ hasBone: boolean, edibleWeight: number, adjustment: object|null }}
 */
function detectBoneInFood(query, totalWeight = 100) {
  const lowerQuery = query.toLowerCase();

  // Check for explicit bone-in indicators
  const boneIndicators = ['bone-in', 'bone in', 'with bone', 'on the bone', 'whole'];
  const hasBoneIndicator = boneIndicators.some(ind => lowerQuery.includes(ind));

  // Check against known bone-in foods
  for (const [boneFood, adjustment] of Object.entries(BONE_ADJUSTMENTS)) {
    if (lowerQuery.includes(boneFood.replace(' bone-in', '')) && hasBoneIndicator) {
      return {
        hasBone: true,
        edibleWeight: Math.round(totalWeight * adjustment.ediblePercent),
        ediblePercent: adjustment.ediblePercent,
        adjustment,
      };
    }
  }

  // T-bone is always bone-in
  if (lowerQuery.includes('t-bone') || lowerQuery.includes('tbone')) {
    const adj = BONE_ADJUSTMENTS['t-bone steak'];
    return {
      hasBone: true,
      edibleWeight: Math.round(totalWeight * adj.ediblePercent),
      ediblePercent: adj.ediblePercent,
      adjustment: adj,
    };
  }

  return { hasBone: false, edibleWeight: totalWeight, adjustment: null };
}

/**
 * Detect leftover/reheated food context
 * @param {string} query - The food query
 * @returns {{ isLeftover: boolean, adjustmentNote: string|null }}
 */
function detectLeftoverFood(query) {
  const lowerQuery = query.toLowerCase();

  const leftoverIndicators = ['leftover', 'left over', 'reheated', 'cold', 'day old', 'yesterday'];
  const isLeftover = leftoverIndicators.some(ind => lowerQuery.includes(ind));

  if (!isLeftover) {
    return { isLeftover: false, adjustmentNote: null };
  }

  // Check for specific leftover foods with known adjustments
  if (lowerQuery.includes('rice')) {
    return { isLeftover: true, adjustmentNote: LEFTOVER_ADJUSTMENTS.reheated_rice.note };
  }
  if (lowerQuery.includes('pasta') || lowerQuery.includes('noodle')) {
    return { isLeftover: true, adjustmentNote: LEFTOVER_ADJUSTMENTS.reheated_pasta.note };
  }
  if (lowerQuery.includes('potato')) {
    return { isLeftover: true, adjustmentNote: LEFTOVER_ADJUSTMENTS.reheated_potato.note };
  }
  if (lowerQuery.includes('pizza')) {
    return { isLeftover: true, adjustmentNote: LEFTOVER_ADJUSTMENTS.leftover_pizza.note };
  }
  if (lowerQuery.includes('fried')) {
    return { isLeftover: true, adjustmentNote: LEFTOVER_ADJUSTMENTS.leftover_fried.note };
  }

  return { isLeftover: true, adjustmentNote: 'Leftover food - nutrition similar to fresh' };
}

/**
 * Detect keto/sugar-free foods with sugar alcohols
 * @param {string} query - The food query
 * @returns {{ hasSugarAlcohols: boolean, sweetenerType: string|null, note: string|null }}
 */
function detectSugarAlcohols(query) {
  const lowerQuery = query.toLowerCase();

  // Check for keto/sugar-free indicators
  const ketoIndicators = ['keto', 'sugar free', 'sugar-free', 'no sugar', 'diabetic', 'low carb'];
  const isLikelyKetoFood = ketoIndicators.some(ind => lowerQuery.includes(ind));

  // Check for specific sweeteners
  for (const [sweetener, data] of Object.entries(SUGAR_ALCOHOLS)) {
    if (lowerQuery.includes(sweetener)) {
      return {
        hasSugarAlcohols: true,
        sweetenerType: sweetener,
        kcalPerGram: data.kcalPerGram,
        note: data.note,
      };
    }
  }

  // If it's a keto food but no specific sweetener mentioned
  if (isLikelyKetoFood) {
    return {
      hasSugarAlcohols: true,
      sweetenerType: 'unknown',
      kcalPerGram: null,
      note: 'Keto/sugar-free food - may contain sugar alcohols with reduced calories',
    };
  }

  return { hasSugarAlcohols: false, sweetenerType: null, note: null };
}

// Export utility functions for use in resolver
export {
  expandAbbreviations,
  detectHomonyms,
  parseVagueQuantity,
  parseNegationModifiers,
  parseAdditionModifiers,
  detectPreparationContext,
  detectBrandFood,
  detectBoneInFood,
  detectLeftoverFood,
  detectSugarAlcohols,
  HOMONYMS,
  ABBREVIATIONS,
  VAGUE_QUANTITIES,
  PREPARATION_ADJUSTMENTS,
  BRAND_FOODS,
  BONE_ADJUSTMENTS,
  SUGAR_ALCOHOLS,
  LEFTOVER_ADJUSTMENTS,
};

function buildEstimatorSystemPrompt(options = {}) {
  const { preparationContext, hasNegations, hasAdditions, needsDisambiguation } = options;

  return `You are an EXPERT nutrition estimator with calibrated uncertainty.

RESPONSE FORMAT: Valid JSON only. No explanations outside JSON.

═══════════════════════════════════════════════════════════════════
CRITICAL RULES (MUST FOLLOW)
═══════════════════════════════════════════════════════════════════

RULE #1: PRESERVE EXACT FOOD NAME
- "foodName" MUST be EXACTLY what user typed (never change/translate/substitute)
- Example: "Chamadhumpa curry" → foodName: "Chamadhumpa curry" (NOT "chicken curry")
- For unknown foods, keep exact name and estimate based on similar dishes

RULE #2: EXPLICIT UNCERTAINTY - Say "I don't know" when appropriate
- If you cannot identify the food: set recognitionStatus: "unknown"
- If nutrition is highly uncertain: provide wide confidence intervals
- NEVER hallucinate specific values for unrecognizable foods

RULE #3: HANDLE MODIFIERS CORRECTLY
${hasNegations ? `- User specified NEGATIONS (without/no/less) - ZERO OUT or REDUCE those components
- "without sugar" → sugar_g: 0
- "no cheese" → remove cheese calories/fat
- "less oil" → reduce fat by 30-50%` : ''}
${hasAdditions ? `- User specified ADDITIONS (extra/double) - INCREASE those components
- "extra cheese" → multiply cheese portion by 1.5
- "double meat" → multiply protein source by 2` : ''}
${!hasNegations && !hasAdditions ? '- No modifiers detected in this query' : ''}

RULE #4: PREPARATION CONTEXT MATTERS
${preparationContext?.context === 'restaurant' ? `- RESTAURANT FOOD DETECTED: Add +25-30% to fat, +40% to sodium
- Restaurants use more butter, oil, and salt than home cooking` : ''}
${preparationContext?.context === 'fast_food' ? `- FAST FOOD DETECTED: Add +40-50% to fat, +60% to sodium
- Fast food is calorie-dense with high sodium` : ''}
${preparationContext?.context === 'homemade' ? `- HOMEMADE DETECTED: Use standard reference values
- Typical home cooking with moderate oil/salt` : ''}
${!preparationContext?.context || preparationContext.context === 'unknown' ? `- No preparation context specified - assume home-cooked` : ''}

${needsDisambiguation ? `
RULE #5: DISAMBIGUATION REQUIRED
- The food name is AMBIGUOUS (multiple possible meanings)
- You MUST set "disambiguationNeeded": true
- Provide "possibleInterpretations" array with likelihood scores
- Make your BEST GUESS for the estimate but flag uncertainty
` : ''}

═══════════════════════════════════════════════════════════════════
CHAIN-OF-THOUGHT REASONING (for complex/regional foods)
═══════════════════════════════════════════════════════════════════

For COMPLEX foods (curries, bowls, multi-ingredient dishes), reason step-by-step:

STEP 1: IDENTIFY - What cuisine? What type of dish? What are likely ingredients?
STEP 2: DECOMPOSE - List main components with estimated proportions
STEP 3: CALCULATE - Sum component nutrition using reference values
STEP 4: VALIDATE - Check calories match Atwater formula (±15%)
STEP 5: ADJUST - Apply preparation context multipliers if applicable

Include your reasoning in the "reasoning" field (brief, 1-3 sentences).

For SIMPLE foods (single ingredients like "apple", "rice"), skip reasoning.

═══════════════════════════════════════════════════════════════════
REFERENCE VALUES (USDA Standard - scale to portion)
═══════════════════════════════════════════════════════════════════

PROTEINS:
- Whole egg (1 large, 50g): 72 cal, 6g P, 0.6g C, 5g F, 0g fiber, 70mg Na
- Chicken breast (100g cooked): 165 cal, 31g P, 0g C, 3.6g F, 0g fiber, 75mg Na
- Salmon (100g cooked): 208 cal, 20g P, 0g C, 13g F, 0g fiber, 60mg Na
- Greek yogurt (1 cup, 245g): 130 cal, 17g P, 8g C, 4g F, 0g fiber, 65mg Na
- Paneer (100g): 265 cal, 18g P, 1.2g C, 21g F, 0g fiber, 18mg Na
- Tofu firm (100g): 144 cal, 17g P, 3g C, 9g F, 0.5g fiber, 10mg Na
- Lentils/Dal cooked (1 cup): 230 cal, 18g P, 40g C, 0.8g F, 16g fiber, 470mg Na
- Chickpeas cooked (1 cup): 269 cal, 15g P, 45g C, 4g F, 12g fiber, 400mg Na

CARBS:
- White rice cooked (1 cup, 158g): 205 cal, 4g P, 45g C, 0.4g F, 0.6g fiber, 300mg Na
- Brown rice cooked (1 cup): 218 cal, 5g P, 46g C, 1.8g F, 3.5g fiber, 10mg Na
- Roti/chapati (1 medium, 40g): 120 cal, 3g P, 24g C, 1g F, 2g fiber, 180mg Na
- Paratha (1 medium, 80g): 280 cal, 6g P, 38g C, 12g F, 2g fiber, 350mg Na
- Pasta cooked (1 cup): 220 cal, 8g P, 43g C, 1.3g F, 2.5g fiber, 1mg Na

VEGETABLES & FIBER:
- Spinach cooked (1 cup): 41 cal, 5g P, 7g C, 0.5g F, 4g fiber, 125mg Na
- Broccoli cooked (1 cup): 55 cal, 4g P, 11g C, 0.6g F, 5g fiber, 65mg Na
- Banana (1 medium): 105 cal, 1.3g P, 27g C, 0.4g F, 3g fiber, 1mg Na

FATS:
- Olive oil (1 tbsp): 119 cal, 0g P, 0g C, 13.5g F, 0g fiber, 0mg Na
- Ghee (1 tbsp): 123 cal, 0g P, 0g C, 14g F, 0g fiber, 0mg Na
- Almonds (1 oz, 28g): 164 cal, 6g P, 6g C, 14g F, 3.5g fiber, 0mg Na

INDIAN DISHES (home-cooked baseline):
- Dal (1 cup): 180 cal, 10g P, 28g C, 3g F, 8g fiber, 450mg Na
- Sambar (1 cup): 150 cal, 7g P, 25g C, 3g F, 6g fiber, 600mg Na
- Chicken curry (1 cup): 300 cal, 25g P, 12g C, 18g F, 2g fiber, 700mg Na

ALCOHOL (special Atwater: 7 kcal/g):
- Beer (12 oz): 150 cal (from alcohol + carbs)
- Wine (5 oz): 125 cal
- Spirits (1.5 oz): 97 cal

SUGAR ALCOHOLS (for keto/sugar-free foods):
- Erythritol: 0 kcal/g (not metabolized - DO NOT count in calories)
- Xylitol: 2.4 kcal/g
- Maltitol: 2.1 kcal/g
- Stevia/Monk fruit: 0 kcal (non-caloric sweeteners)
- For "keto" or "sugar-free" labeled foods: subtract sugar alcohol carbs from calorie calculation

BRAND NAME FOODS (use exact values when detected):
- Big Mac: 550 cal, 25g P, 45g C, 30g F
- Whopper: 657 cal, 28g P, 49g C, 40g F
- Starbucks Grande Latte: 190 cal, 13g P, 19g C, 7g F
- Chipotle Burrito: 1070 cal, 46g P, 114g C, 43g F
- Panera Broccoli Cheddar Soup: 360 cal, 13g P, 30g C, 21g F
- Panda Express Orange Chicken: 490 cal, 25g P, 51g C, 23g F
For brand foods, use EXACT brand nutrition data, not generic estimates.

RESTAURANT FOOD INGREDIENT BREAKDOWN:
When analyzing branded/restaurant foods, ALWAYS provide ingredient components:
- List the main ingredients with estimated portions
- Example for Big Mac:
  components: [
    { "name": "beef patties", "portion": "2 patties (90g)", "calories": 220 },
    { "name": "special sauce", "portion": "2 tbsp", "calories": 90 },
    { "name": "sesame bun", "portion": "1 bun (55g)", "calories": 150 },
    { "name": "american cheese", "portion": "1 slice", "calories": 50 },
    { "name": "lettuce, onions, pickles", "portion": "assorted", "calories": 10 }
  ]
- This helps users understand WHAT they're eating, not just macros
- Set isComplex: true for all restaurant/fast food items

═══════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (ENHANCED)
═══════════════════════════════════════════════════════════════════

{
  "foodName": string,           // EXACT user input - NEVER change
  "portionSize": string,        // e.g., "1 cup", "100g", "1 medium"
  "servingGrams": number,       // Weight in grams

  "recognitionStatus": "identified" | "uncertain" | "unknown",
  "recognitionConfidence": number,  // 0-100

  "macros": {
    "calories_kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "sodium_mg": number
  },

  "confidenceIntervals": {      // NEW: Uncertainty ranges
    "calories": { "low": number, "high": number },
    "protein": { "low": number, "high": number },
    "carbs": { "low": number, "high": number },
    "fat": { "low": number, "high": number }
  },

  "micros": {
    "calcium": number, "iron": number, "magnesium": number,
    "potassium": number, "zinc": number, "vitaminA": number,
    "vitaminC": number, "vitaminD": number, "vitaminB12": number,
    "folate": number
  },

  "disambiguationNeeded": boolean,  // NEW: True if food name is ambiguous
  "possibleInterpretations": [      // NEW: Only if disambiguationNeeded=true
    { "interpretation": string, "likelihood": number, "caloriesIfThis": number }
  ],

  "modifiersApplied": {             // NEW: Track applied modifiers
    "negations": [string],          // Items removed/reduced
    "additions": [string],          // Items increased
    "preparationContext": string    // "homemade", "restaurant", "fast_food", "unknown"
  },

  "isComplex": boolean,
  "components": [
    { "name": string, "portion": string, "calories": number, "protein": number, "carbs": number, "fat": number }
  ],

  "reasoning": string | null,       // NEW: Brief CoT for complex foods
  "estimationMethod": string,
  "assumptions": [string],          // REQUIRED: List ALL assumptions
  "warnings": [string],             // NEW: Any concerns about the estimate
  "potentialAllergens": [string],

  "validationStatus": {             // NEW: Self-validation results
    "atwaterValid": boolean,
    "calculatedCalories": number,
    "reportedCalories": number,
    "discrepancyPercent": number
  }
}

═══════════════════════════════════════════════════════════════════
VALIDATION RULES (SELF-CHECK BEFORE RETURNING)
═══════════════════════════════════════════════════════════════════

1. ATWATER VALIDATION (±15% tolerance):
   digestible_carbs = carbs_g - fiber_g
   expected_calories = (protein_g × 4) + (digestible_carbs × 4) + (fat_g × 9) + (alcohol_g × 7)

   If mismatch > 15%:
   - Re-examine which macro is wrong (usually fat for fried foods)
   - Adjust and set validationStatus.atwaterValid = false with explanation

2. CONSTRAINT VALIDATION:
   - sugar_g ≤ carbs_g (sugar is subset of carbs)
   - fiber_g ≤ carbs_g (fiber is subset of carbs)
   - All values ≥ 0
   - sodium_mg > 0 for any salted/seasoned food

3. CONFIDENCE INTERVAL WIDTH:
   - High confidence (reference food): ±10%
   - Medium confidence (known cuisine): ±20%
   - Low confidence (unknown/regional): ±35%

═══════════════════════════════════════════════════════════════════
CALIBRATED CONFIDENCE SCORING
═══════════════════════════════════════════════════════════════════

recognitionConfidence (0-100) - BE HONEST, NOT OPTIMISTIC:
- 95-100: Exact match to reference food (e.g., "1 large egg")
- 85-94: Well-known food with clear description (e.g., "grilled chicken breast")
- 70-84: Common food with some ambiguity (e.g., "chicken curry" - many variants)
- 55-69: Regional/ethnic dish with estimated composition
- 40-54: Unusual food, multiple assumptions needed
- <40: Cannot reliably identify - set recognitionStatus: "unknown"

For recognitionConfidence < 60, you MUST:
- Set wider confidence intervals
- Add to "warnings" array explaining uncertainty
- Consider adding clarifyingQuestion`;
}

/**
 * Build system prompt for complex foods requiring CoT reasoning
 */
function buildComplexFoodSystemPrompt(options = {}) {
  const basePrompt = buildEstimatorSystemPrompt(options);

  return basePrompt + `

═══════════════════════════════════════════════════════════════════
COMPLEX FOOD ANALYSIS (REQUIRED FOR THIS QUERY)
═══════════════════════════════════════════════════════════════════

This food requires detailed analysis. You MUST:

1. DECOMPOSITION (in "components" array):
   - List 5-10 main ingredients
   - Estimate portion of each (in grams or standard units)
   - Calculate nutrition for each component

2. SUMMATION VALIDATION:
   - Sum of component calories MUST equal total calories (±5%)
   - If they don't match, adjust proportions

3. REGIONAL AUTHENTICITY:
   - Use authentic ingredients for the cuisine
   - Indian: include ghee/oil, onion, tomato, ginger, garlic, spices
   - Mexican: include oil, onion, cilantro, lime, appropriate chilies
   - Italian: include olive oil, garlic, tomatoes, herbs

4. COOKING METHOD IMPACT:
   - Deep fried: +40-60% fat absorption
   - Pan fried: +20-30% fat
   - Grilled/baked: minimal fat addition
   - Steamed/boiled: no fat addition`;
}

/**
 * Build nutrition estimation prompt with full preprocessing
 * @param {string} foodQuery - The raw food query from user
 * @param {string} portion - The portion size (default: '1 serving')
 * @param {object} context - Optional context (userId, mealType, etc.)
 * @returns {{ system: string, user: string, metadata: object }}
 */
export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving', context = {}) {
  // Step 1: Sanitize input
  const cleanQuery = sanitizeFoodQuery(foodQuery);
  const cleanPortion = sanitizeFoodQuery(portion);

  // Step 2: Expand abbreviations
  const abbrevResult = expandAbbreviations(cleanQuery);

  // Step 3: Detect homonyms requiring disambiguation
  const homonymResult = detectHomonyms(abbrevResult.expanded);

  // Step 4: Parse vague quantities
  const vagueQtyResult = parseVagueQuantity(cleanQuery);

  // Step 5: Parse negation modifiers (without, no, less)
  const negationResult = parseNegationModifiers(cleanQuery);

  // Step 6: Parse addition modifiers (extra, double)
  const additionResult = parseAdditionModifiers(cleanQuery);

  // Step 7: Detect preparation context
  const prepContext = detectPreparationContext(cleanQuery);

  // Step 8: NEW - Detect brand name foods
  const brandResult = detectBrandFood(cleanQuery);

  // Step 9: NEW - Detect bone-in foods
  const boneResult = detectBoneInFood(cleanQuery);

  // Step 10: NEW - Detect leftover/reheated foods
  const leftoverResult = detectLeftoverFood(cleanQuery);

  // Step 11: NEW - Detect sugar alcohols/keto foods
  const sugarAlcoholResult = detectSugarAlcohols(cleanQuery);

  // Build metadata for response processing
  const metadata = {
    originalQuery: foodQuery,
    cleanQuery,
    expandedQuery: abbrevResult.expanded,
    wasAbbreviationExpanded: abbrevResult.wasExpanded,
    abbreviation: abbrevResult.abbreviation || null,
    needsDisambiguation: homonymResult.needsDisambiguation,
    homonym: homonymResult.homonym,
    possibleMeanings: homonymResult.possibilities,
    vagueQuantity: vagueQtyResult,
    negations: negationResult,
    additions: additionResult,
    preparationContext: prepContext,
    // NEW metadata fields
    brandFood: brandResult,
    boneIn: boneResult,
    leftover: leftoverResult,
    sugarAlcohols: sugarAlcoholResult,
  };

  // Build prompt options
  const promptOptions = {
    preparationContext: prepContext,
    hasNegations: negationResult.hasNegation,
    hasAdditions: additionResult.hasAdditions,
    needsDisambiguation: homonymResult.needsDisambiguation,
  };

  // Determine if this needs complex food analysis
  const isLikelyComplex = /curry|bowl|biryani|pizza|burger|pasta|salad|wrap|burrito|stew|soup/i.test(cleanQuery);
  const systemPrompt = isLikelyComplex
    ? buildComplexFoodSystemPrompt(promptOptions)
    : buildEstimatorSystemPrompt(promptOptions);

  // Build user prompt with all context
  let userPrompt = `Estimate nutrition for: "${abbrevResult.expanded}" (${cleanPortion}).

CRITICAL: Set foodName to EXACTLY "${cleanQuery}" - do not change or substitute.`;

  // Add disambiguation instruction if needed
  if (homonymResult.needsDisambiguation) {
    userPrompt += `

⚠️ AMBIGUOUS FOOD DETECTED: "${homonymResult.homonym}"
Possible meanings: ${homonymResult.possibilities.join(', ')}
→ Set disambiguationNeeded: true
→ Provide possibleInterpretations array
→ Make your BEST GUESS for the primary estimate`;
  }

  // Add modifier instructions if present
  if (negationResult.hasNegation) {
    userPrompt += `

⚠️ NEGATION MODIFIERS DETECTED:
- Items to REMOVE/ZERO: ${negationResult.removedItems.join(', ') || 'none'}
- Items to REDUCE (50%): ${negationResult.reducedItems.join(', ') || 'none'}
→ Adjust macros accordingly and note in modifiersApplied`;
  }

  if (additionResult.hasAdditions) {
    userPrompt += `

⚠️ ADDITION MODIFIERS DETECTED:
${additionResult.additions.map(a => `- "${a.item}": multiply by ${a.multiplier}x`).join('\n')}
→ Adjust macros accordingly and note in modifiersApplied`;
  }

  // Add vague quantity instruction
  if (vagueQtyResult.detected) {
    userPrompt += `

⚠️ VAGUE QUANTITY DETECTED: "${vagueQtyResult.vagueWord}"
→ Interpretation: ${vagueQtyResult.note}
→ Apply multiplier: ${vagueQtyResult.multiplier}x to standard portion
→ Add to assumptions array`;
  }

  // Add preparation context
  if (prepContext.context !== 'unknown') {
    userPrompt += `

📍 PREPARATION CONTEXT: ${prepContext.context.toUpperCase()}
→ ${prepContext.adjustments?.note || 'Apply standard adjustments'}`;
  }

  // NEW: Add brand food context
  if (brandResult.isBrandFood) {
    userPrompt += `

🏷️ BRAND FOOD DETECTED: "${brandResult.brandFood}" from ${brandResult.brand}
→ Use these EXACT values: ${brandResult.brandData.calories} cal, ${brandResult.brandData.protein}g P, ${brandResult.brandData.carbs}g C, ${brandResult.brandData.fat}g F
→ Sodium: ${brandResult.brandData.sodium}mg
→ DO NOT estimate - use brand-specific nutrition data`;
  }

  // NEW: Add bone-in food context
  if (boneResult.hasBone) {
    userPrompt += `

🦴 BONE-IN FOOD DETECTED
→ ${boneResult.adjustment?.note || 'Account for bone weight'}
→ Edible portion: ${(boneResult.ediblePercent * 100).toFixed(0)}% of total weight
→ Calculate nutrition based on EDIBLE portion only`;
  }

  // NEW: Add leftover food context
  if (leftoverResult.isLeftover) {
    userPrompt += `

🍱 LEFTOVER/REHEATED FOOD DETECTED
→ ${leftoverResult.adjustmentNote}
→ Add "leftover" or "reheated" to assumptions`;
  }

  // NEW: Add sugar alcohol/keto context
  if (sugarAlcoholResult.hasSugarAlcohols) {
    userPrompt += `

🥤 KETO/SUGAR-FREE FOOD DETECTED
→ ${sugarAlcoholResult.note}
→ Sugar alcohols (${sugarAlcoholResult.sweetenerType || 'type unknown'}) have reduced/zero calories
→ Do NOT count sugar alcohols as regular carbs in calorie calculation
→ If erythritol/stevia/monk fruit: those carbs = 0 effective calories`;
  }

  userPrompt += `

Return JSON only.`;

  return {
    system: systemPrompt,
    user: userPrompt,
    metadata, // Return metadata for post-processing
  };
}

/**
 * Build batch nutrition estimation prompt
 * @param {Array<{name: string, portion?: string}>} foodItems
 * @returns {{ system: string, user: string, metadata: object }}
 */
export function buildBatchNutritionEstimationPrompt(foodItems) {
  // Process each item for abbreviations, homonyms, modifiers
  const processedItems = foodItems.map((item, i) => {
    const cleanName = sanitizeFoodQuery(item.name);
    const cleanPortion = sanitizeFoodQuery(item.portion || '1 serving');

    // Quick preprocessing
    const abbrevResult = expandAbbreviations(cleanName);
    const homonymResult = detectHomonyms(abbrevResult.expanded);
    const negationResult = parseNegationModifiers(cleanName);
    const additionResult = parseAdditionModifiers(cleanName);

    return {
      index: i + 1,
      original: item.name,
      expanded: abbrevResult.expanded,
      portion: cleanPortion,
      needsDisambiguation: homonymResult.needsDisambiguation,
      hasNegations: negationResult.hasNegation,
      hasAdditions: additionResult.hasAdditions,
      negations: negationResult,
      additions: additionResult,
    };
  });

  // Build items list with flags
  const itemsList = processedItems
    .map(item => {
      let entry = `${item.index}. "${item.expanded}" (${item.portion})`;
      if (item.needsDisambiguation) entry += ' ⚠️ AMBIGUOUS';
      if (item.hasNegations) entry += ` [REMOVE: ${item.negations.removedItems.join(',')}]`;
      if (item.hasAdditions) entry += ` [EXTRA: ${item.additions.additions.map(a => a.item).join(',')}]`;
      return entry;
    })
    .join('\n');

  // Use base system prompt (batch is typically simpler foods)
  const systemPrompt = buildEstimatorSystemPrompt({});

  return {
    system: systemPrompt,
    user: `Estimate nutrition for each item independently:

${itemsList}

RULES FOR BATCH:
- Each item gets its own complete JSON object
- Preserve EXACT food names as provided
- Apply modifiers noted in brackets (REMOVE, EXTRA)
- Items marked ⚠️ AMBIGUOUS need disambiguationNeeded: true

Return JSON array: [{ item1 }, { item2 }, ...]`,
    metadata: {
      itemCount: foodItems.length,
      processedItems,
      hasAmbiguousItems: processedItems.some(i => i.needsDisambiguation),
      hasModifiedItems: processedItems.some(i => i.hasNegations || i.hasAdditions),
    }
  };
}

/**
 * Build meal parsing prompt with comprehensive modifier handling
 * @param {string} mealDescription - The meal description text
 * @returns {{ system: string, user: string }}
 */
export function buildMealParsingPrompt(mealDescription) {
  const cleanDescription = sanitizeFoodQuery(mealDescription);

  return {
    system: `You are an EXPERT meal parser that extracts food items with PRECISE modifier handling.
Return JSON only.

═══════════════════════════════════════════════════════════════════
CRITICAL: MODIFIER HANDLING RULES
═══════════════════════════════════════════════════════════════════

NEGATION MODIFIERS (REMOVE/REDUCE):
- "without X", "no X", "hold the X" → Remove X entirely, set removed: true
- "less X", "light X", "low X" → Reduce X by 50%, set reduced: true
- Examples:
  - "coffee without sugar" → coffee item + "removed": ["sugar"]
  - "salad no dressing" → salad item + "removed": ["dressing"]
  - "less oil" → "reduced": ["oil"]

ADDITION MODIFIERS (INCREASE):
- "extra X" → Multiply X by 1.5
- "double X" → Multiply X by 2
- "triple X" → Multiply X by 3
- Examples:
  - "extra cheese pizza" → pizza item + "additions": [{"item": "cheese", "multiplier": 1.5}]
  - "double shot espresso" → espresso item + "additions": [{"item": "shot", "multiplier": 2}]

QUANTITY MODIFIERS:
- "half", "quarter" → Multiply portion by 0.5, 0.25
- "a few" → quantity: 3
- "some" → quantity: 1 (standard serving)
- "generous" → Multiply by 1.5
- "small/large" → Multiply by 0.75/1.5
- NEVER discard these - they significantly affect calories!

COOKING METHOD MODIFIERS:
- Capture: grilled, fried, baked, steamed, raw, sauteed, roasted, deep-fried
- This affects fat content significantly:
  - deep-fried: +50% fat
  - pan-fried: +25% fat
  - grilled/baked: standard
  - steamed/raw: minimal fat

PREPARATION CONTEXT:
- Detect: homemade, restaurant, fast food, takeout, delivery
- This affects portion size and nutrient density

═══════════════════════════════════════════════════════════════════
COMPOUND FOOD SEMANTICS
═══════════════════════════════════════════════════════════════════

"X and Y" → TWO separate items (rice AND dal = 2 items)
"X with Y" → ONE item with addition (rice WITH dal = rice-dal combo OR rice + side of dal)
"X or Y" → User is unsure, ask for clarification OR pick most common

═══════════════════════════════════════════════════════════════════
IMPLICIT ITEMS (commonly forgotten)
═══════════════════════════════════════════════════════════════════

Always check if these should be added:
- Curry → gravy/sauce
- Sandwich → spread (mayo/butter)
- Salad → dressing (unless "no dressing" specified)
- Pizza → crust oil
- Fries → ketchup
- Toast → butter
- Coffee/tea → milk/sugar (unless "black" specified)
- Roti/naan → ghee brushed on top

═══════════════════════════════════════════════════════════════════
DRY vs COOKED STATE
═══════════════════════════════════════════════════════════════════

CRITICAL DISTINCTION:
- "1 cup rice" typically means COOKED (205 cal)
- "1 cup dry rice" means UNCOOKED (675 cal) - 3x difference!
- Same for pasta, oats, lentils

If ambiguous, assume COOKED and note in assumptions.

═══════════════════════════════════════════════════════════════════
CONFIDENCE SCORING (CALIBRATED)
═══════════════════════════════════════════════════════════════════

95-100: Explicit foods + explicit portions + clear modifiers
        "2 scrambled eggs with 1 slice whole wheat toast, no butter"

85-94:  Clear foods + explicit portions, minor inference
        "2 eggs and toast"

70-84:  Clear foods, inferred portions
        "eggs and toast for breakfast"

55-69:  Vague description, multiple assumptions
        "had some breakfast food"

40-54:  Very vague, many assumptions needed
        "ate something light"

<40:    Cannot parse meaningfully
        "food", "stuff", "meal"`,

    user: `Meal text: "${cleanDescription}"

Return JSON:
{
  "rawText": string,                    // EXACT original input
  "items": [{
    "name": string,                     // Food name (keep original spelling)
    "portion": string,                  // Detected or inferred portion
    "quantity": number | null,          // Numeric quantity if detected
    "unit": string | null,              // Unit (cup, piece, oz, g, etc.)
    "cookingMethod": string | null,     // grilled, fried, etc.
    "removed": [string],                // Items removed via negation
    "reduced": [string],                // Items reduced via "less/light"
    "additions": [{"item": string, "multiplier": number}],
    "portionModifier": {                // Vague quantity handling
      "word": string | null,            // "generous", "small", etc.
      "multiplier": number              // Applied multiplier
    },
    "state": "cooked" | "raw" | "dry" | "unknown",
    "isAmbiguous": boolean,             // True if food name has multiple meanings
    "confidence": number                // Item-level confidence 0-100
  }],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "unknown",
  "preparationContext": "homemade" | "restaurant" | "fast_food" | "takeout" | "unknown",
  "confidence": number,                 // Overall parsing confidence
  "implicitItems": [{                   // Items typically included but not mentioned
    "name": string,
    "reason": string,                   // Why this was added
    "portion": string
  }],
  "clarificationNeeded": [{             // Questions to ask user
    "item": string,
    "question": string,
    "options": [string]
  }],
  "assumptions": [string],              // All assumptions made
  "warnings": [string]                  // Potential issues detected
}

RULES:
1. Parse EVERY food mentioned, even if ambiguous
2. NEVER discard modifiers - they significantly affect calories
3. For vague quantities, pick reasonable default AND note assumption
4. Always check for implicit items (dressings, sauces, spreads)
5. If "dry" vs "cooked" is ambiguous, assume cooked and note it`,
  };
}
