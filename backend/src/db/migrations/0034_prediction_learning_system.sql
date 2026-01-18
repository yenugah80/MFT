-- ============================================================================
-- PREDICTION LEARNING SYSTEM
-- A closed-loop system that learns from each user individually
-- ============================================================================

-- 1. PREDICTION LOG - Every prediction we make
-- Stores predictions at creation time so we can check outcomes later
CREATE TABLE IF NOT EXISTS prediction_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- What we predicted
    prediction_type TEXT NOT NULL, -- 'energy_crash', 'mood_dip', 'dehydration', 'hunger', 'sleep_quality'
    prediction_subtype TEXT, -- 'sugar_crash', 'low_protein', 'late_meal', etc.

    -- The specific prediction
    predicted_outcome TEXT NOT NULL, -- 'low_energy', 'mood_drop', 'fatigue', etc.
    predicted_severity TEXT NOT NULL, -- 'high', 'medium', 'low'
    predicted_time TIMESTAMP NOT NULL, -- When we expect the outcome
    prediction_window_minutes INTEGER DEFAULT 60, -- +/- window for checking

    -- The cause (what triggered this prediction)
    trigger_type TEXT NOT NULL, -- 'meal', 'hydration', 'sleep', 'pattern'
    trigger_data JSONB NOT NULL, -- Full context: { mealId, calories, sugar, protein, ... }

    -- Our confidence at prediction time
    confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
    confidence_factors JSONB, -- What contributed to confidence

    -- Thresholds used (for learning later)
    thresholds_used JSONB NOT NULL, -- { sugarThreshold: 25, proteinThreshold: 10, ... }
    was_personalized BOOLEAN DEFAULT FALSE, -- Were thresholds personalized?

    -- User messaging (what we showed them)
    user_message TEXT NOT NULL, -- "High sugar lunch may cause a 3pm energy dip"
    prevention_tip TEXT, -- "Try a protein snack around 2:30pm"

    -- Outcome tracking
    check_in_sent_at TIMESTAMP, -- When we sent the check-in prompt
    check_in_method TEXT, -- 'push', 'in_app', 'none'
    outcome_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'denied', 'skipped', 'expired'

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL -- When this prediction is no longer relevant
);

-- 2. PREDICTION OUTCOMES - User feedback on predictions
CREATE TABLE IF NOT EXISTS prediction_outcomes (
    id SERIAL PRIMARY KEY,
    prediction_id INTEGER NOT NULL REFERENCES prediction_log(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- User's actual experience
    actual_outcome TEXT NOT NULL, -- 'as_predicted', 'opposite', 'no_effect', 'unsure'
    outcome_intensity INTEGER, -- 1-5 scale (1=barely noticeable, 5=very strong)

    -- Timing accuracy
    timing_accuracy TEXT, -- 'early', 'on_time', 'late', 'no_outcome'
    actual_time TIMESTAMP, -- When they actually felt it

    -- Optional context from user
    user_notes TEXT,
    context_factors JSONB, -- { hadSnack: true, exercised: false, stressed: true }

    -- Did our prediction help?
    was_helpful BOOLEAN,
    followed_prevention_tip BOOLEAN,
    tip_effectiveness TEXT, -- 'helped', 'no_effect', 'not_applicable'

    -- Quick feedback buttons used
    feedback_method TEXT NOT NULL, -- 'quick_emoji', 'detailed_form', 'mood_log', 'implicit'

    -- Calculated accuracy
    prediction_accurate BOOLEAN NOT NULL, -- Did we get it right?
    accuracy_score DECIMAL(3,2), -- 0.00-1.00 nuanced accuracy

    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. USER THRESHOLDS - Personalized thresholds that evolve over time
CREATE TABLE IF NOT EXISTS user_thresholds (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- Threshold type and value
    threshold_type TEXT NOT NULL, -- 'sugar_crash', 'protein_fatigue', 'hydration_warning', etc.
    threshold_value DECIMAL(10,2) NOT NULL, -- The actual threshold value
    threshold_unit TEXT NOT NULL, -- 'grams', 'percent', 'hours', 'liters'

    -- How we determined this threshold
    source TEXT NOT NULL, -- 'default', 'population_average', 'personal_learning', 'manual'

    -- Learning metrics
    predictions_made INTEGER DEFAULT 0,
    predictions_correct INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(3,2), -- predictions_correct / predictions_made

    -- Adjustment history
    initial_value DECIMAL(10,2) NOT NULL,
    adjustment_count INTEGER DEFAULT 0,
    last_adjustment_at TIMESTAMP,
    adjustment_reason TEXT,

    -- Confidence in this threshold
    confidence_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'validated'
    min_samples_for_adjustment INTEGER DEFAULT 5,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, threshold_type)
);

-- 4. PREDICTION STORIES - "Remember when" moments for user connection
CREATE TABLE IF NOT EXISTS prediction_stories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- The story
    story_type TEXT NOT NULL, -- 'remember_when', 'pattern_discovered', 'milestone', 'learning'
    story_title TEXT NOT NULL, -- "Remember Tuesday's 3pm crash?"
    story_body TEXT NOT NULL, -- Full narrative
    story_emoji TEXT, -- Lead emoji

    -- Related data
    related_prediction_ids INTEGER[], -- Array of prediction_log IDs
    related_dates DATE[], -- Dates involved in the story
    pattern_data JSONB, -- { triggerFood: 'pasta', outcomeTime: '3pm', occurrences: 4 }

    -- Engagement
    shown_count INTEGER DEFAULT 0,
    last_shown_at TIMESTAMP,
    user_acknowledged BOOLEAN DEFAULT FALSE,
    user_reaction TEXT, -- 'helpful', 'already_knew', 'surprising', 'dismissed'

    -- Freshness
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- Decays over time
    expires_at TIMESTAMP, -- When this story is no longer relevant

    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. PREDICTION ACCURACY METRICS - Aggregate accuracy tracking
CREATE TABLE IF NOT EXISTS prediction_accuracy_metrics (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- What we're tracking
    prediction_type TEXT NOT NULL,
    time_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Counts
    total_predictions INTEGER DEFAULT 0,
    confirmed_accurate INTEGER DEFAULT 0,
    confirmed_inaccurate INTEGER DEFAULT 0,
    user_unsure INTEGER DEFAULT 0,
    no_response INTEGER DEFAULT 0,

    -- Rates
    accuracy_rate DECIMAL(4,3), -- confirmed_accurate / (confirmed_accurate + confirmed_inaccurate)
    response_rate DECIMAL(4,3), -- (confirmed + inaccurate + unsure) / total

    -- Calibration (is our confidence accurate?)
    avg_confidence DECIMAL(3,2),
    calibration_error DECIMAL(4,3), -- |avg_confidence - accuracy_rate|

    -- Trends
    accuracy_trend TEXT, -- 'improving', 'stable', 'declining'
    trend_slope DECIMAL(6,4),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, prediction_type, time_period, period_start)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Prediction log indexes
CREATE INDEX IF NOT EXISTS idx_prediction_log_user_status ON prediction_log(user_id, outcome_status);
CREATE INDEX IF NOT EXISTS idx_prediction_log_predicted_time ON prediction_log(predicted_time);
CREATE INDEX IF NOT EXISTS idx_prediction_log_expires ON prediction_log(expires_at) WHERE outcome_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_prediction_log_type ON prediction_log(user_id, prediction_type);

-- Outcome indexes
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_user ON prediction_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_accurate ON prediction_outcomes(user_id, prediction_accurate);

-- Threshold indexes
CREATE INDEX IF NOT EXISTS idx_user_thresholds_user ON user_thresholds(user_id);

-- Story indexes
CREATE INDEX IF NOT EXISTS idx_prediction_stories_user ON prediction_stories(user_id, story_type);
CREATE INDEX IF NOT EXISTS idx_prediction_stories_shown ON prediction_stories(user_id, last_shown_at);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_accuracy_metrics_user_type ON prediction_accuracy_metrics(user_id, prediction_type);
