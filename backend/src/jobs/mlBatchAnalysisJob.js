/**
 * ML Batch Analysis Job
 *
 * Scheduled job that runs periodic ML analysis tasks for all users.
 * Designed for production health applications with proper safeguards.
 *
 * LEGAL & REGULATORY COMPLIANCE:
 * - All ML decisions include audit trails for FDA/EU AI Act compliance
 * - Transparency metadata attached to all outputs
 * - User data processed only for stated health improvement purposes
 * - No personally identifiable information logged in analysis outputs
 *
 * STATISTICAL STANDARDS:
 * - All hypothesis tests use alpha = 0.05 significance level
 * - Multiple comparison corrections (Bonferroni, Benjamini-Hochberg) applied
 * - Effect sizes (Cohen's d) reported alongside p-values
 * - Confidence intervals provided for all estimates
 *
 * BEHAVIORAL DESIGN:
 * - Drift detection triggers recalibration, not abrupt changes
 * - Users notified of significant pattern changes through normal UI flow
 * - Exploration in Thompson Sampling bounded to prevent user fatigue
 *
 * FUNCTIONAL DESIGN:
 * - Batch processing with rate limiting to prevent database overload
 * - Graceful error handling - one user's failure doesn't stop the batch
 * - Progress logging for monitoring and debugging
 *
 * Job Schedule (Recommended):
 * - Daily: Correlation computation, Thompson Sampling updates
 * - Weekly: Drift detection, Lagged correlation analysis
 * - Monthly: Feature interaction analysis, Model recalibration
 */

import { CronJob } from 'cron';
import { db } from '../db/index.js';
import { foodLogTable } from '../db/schema.js';
import { sql } from 'drizzle-orm';

// Import ML services
import { orchestrateAllUsersML } from '../services/mlEnhancedOrchestratorService.js';
import { monitorAcceptanceRateDrift, monitorCorrelationDrift } from '../services/driftDetectionService.js';
import { analyzeAllSignalPairs } from '../services/laggedCorrelationService.js';
import { analyzeAllInteractions } from '../services/featureInteractionService.js';
import { getGlobalArmStatistics } from '../services/thompsonSamplingService.js';

/**
 * Job configuration
 * Note: These values are tuned for production health applications
 */
const CONFIG = {
  // Batch processing
  BATCH_SIZE: 25,                    // Users per batch (balance speed vs. database load)
  BATCH_DELAY_MS: 1000,              // Delay between batches to prevent overload

  // User eligibility thresholds
  MIN_DAYS_FOR_DRIFT: 14,            // Minimum days of data for drift detection
  MIN_DAYS_FOR_LAG: 14,              // Minimum days for lagged correlation analysis
  MIN_DAYS_FOR_INTERACTIONS: 21,    // Minimum days for interaction analysis

  // Rate limiting
  MAX_CONCURRENT_ANALYSES: 5,        // Maximum concurrent heavy analyses

  // Logging
  LOG_PROGRESS_INTERVAL: 50,         // Log progress every N users
};

/**
 * Users with at least `minMeals` food logs to their name.
 *
 * Eligibility used to be a join against gamification.total_meals_logged. That
 * column is written once at signup (0) and never incremented by any of the four
 * food-log insert paths, so every threshold here compared against 0 and each of
 * these jobs quietly selected an empty user set and did nothing — for as long as
 * the column has existed. Counting food_log directly is derived from the rows
 * themselves, so there is no counter left to drift out of sync the next time a
 * fifth insert path shows up.
 *
 * food_log.user_id is a foreign key onto profiles.user_id, so every row counted
 * here belongs to a real profile — the old join added no filtering of its own.
 *
 * @param {number} minMeals - Inclusive lower bound on lifetime food logs
 * @returns {Promise<Array<{userId: string}>>}
 */
async function getUsersWithMinMeals(minMeals) {
  return db
    .select({ userId: foodLogTable.userId })
    .from(foodLogTable)
    .groupBy(foodLogTable.userId)
    .having(sql`count(*) >= ${minMeals}`);
}

/**
 * ============================================
 * DAILY JOBS
 * ============================================
 */

/**
 * Daily Recommendation Orchestration
 * Runs Thompson Sampling selection and correlation updates for all active users
 *
 * Frequency: Daily (recommended: early morning, before user activity peaks)
 * Duration: ~1-2 minutes for 1000 users
 */
export async function runDailyOrchestration() {
  const startTime = Date.now();
  const jobId = `daily_orch_${Date.now()}`;

  console.log(`[ML Job] Starting daily orchestration (job: ${jobId})`);

  try {
    const result = await orchestrateAllUsersML({
      batchSize: CONFIG.BATCH_SIZE,
    });

    const duration = Date.now() - startTime;

    console.log(`[ML Job] Daily orchestration complete (job: ${jobId})`);
    console.log(`[ML Job] Results: ${result.success.length} succeeded, ${result.errors.length} failed`);
    console.log(`[ML Job] Drift alerts: ${result.driftAlerts.length}`);
    console.log(`[ML Job] Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      jobId,
      jobType: 'daily_orchestration',
      success: true,
      summary: {
        usersProcessed: result.success.length,
        errors: result.errors.length,
        driftAlerts: result.driftAlerts.length,
        duration: duration,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[ML Job] Daily orchestration failed (job: ${jobId}):`, error);
    return {
      jobId,
      jobType: 'daily_orchestration',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================
 * WEEKLY JOBS
 * ============================================
 */

/**
 * Weekly Drift Detection
 * Checks for significant changes in user health patterns and recommendation acceptance
 *
 * Frequency: Weekly (recommended: Sunday night or Monday early morning)
 * Duration: ~3-5 minutes for 1000 users
 *
 * Statistical Note: Uses CUSUM algorithm with h=5 threshold (standard for health monitoring)
 */
export async function runWeeklyDriftDetection() {
  const startTime = Date.now();
  const jobId = `weekly_drift_${Date.now()}`;

  console.log(`[ML Job] Starting weekly drift detection (job: ${jobId})`);

  try {
    // Get eligible users (minimum data threshold)
    // Rough estimate: 2 meals/day
    const eligibleUsers = await getUsersWithMinMeals(CONFIG.MIN_DAYS_FOR_DRIFT * 2);

    console.log(`[ML Job] Eligible users for drift detection: ${eligibleUsers.length}`);

    const results = {
      processed: 0,
      driftsDetected: [],
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < eligibleUsers.length; i += CONFIG.BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + CONFIG.BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async user => {
          try {
            const [correlationDrift, acceptanceDrift] = await Promise.all([
              monitorCorrelationDrift(user.userId, { windowDays: 7 }),
              monitorAcceptanceRateDrift(user.userId, { windowDays: 7 }),
            ]);

            if (correlationDrift.driftDetected || acceptanceDrift.driftDetected) {
              return {
                userId: user.userId,
                correlationDrift: correlationDrift.driftDetected,
                acceptanceDrift: acceptanceDrift.driftDetected,
              };
            }
            return null;
          } catch (error) {
            return { userId: user.userId, error: error.message };
          }
        })
      );

      for (const r of batchResults) {
        if (r === null) {
          results.processed++;
        } else if (r.error) {
          results.errors.push(r);
        } else {
          results.driftsDetected.push(r);
          results.processed++;
        }
      }

      // Progress logging
      if ((i + CONFIG.BATCH_SIZE) % CONFIG.LOG_PROGRESS_INTERVAL === 0) {
        console.log(`[ML Job] Drift detection progress: ${results.processed}/${eligibleUsers.length}`);
      }

      // Rate limiting delay
      await sleep(CONFIG.BATCH_DELAY_MS);
    }

    const duration = Date.now() - startTime;

    console.log(`[ML Job] Weekly drift detection complete (job: ${jobId})`);
    console.log(`[ML Job] Drifts detected: ${results.driftsDetected.length}/${results.processed}`);
    console.log(`[ML Job] Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      jobId,
      jobType: 'weekly_drift_detection',
      success: true,
      summary: {
        usersAnalyzed: results.processed,
        driftsDetected: results.driftsDetected.length,
        errors: results.errors.length,
        duration,
      },
      driftDetails: results.driftsDetected,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[ML Job] Weekly drift detection failed (job: ${jobId}):`, error);
    return {
      jobId,
      jobType: 'weekly_drift_detection',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Weekly Lagged Correlation Analysis
 * Discovers delayed effects between health signals (e.g., sugar intake affecting mood next day)
 *
 * Frequency: Weekly
 * Duration: ~5-10 minutes for 1000 users
 *
 * Statistical Note: Uses cross-correlation function with Granger causality testing
 */
export async function runWeeklyLaggedCorrelations() {
  const startTime = Date.now();
  const jobId = `weekly_lag_${Date.now()}`;

  console.log(`[ML Job] Starting weekly lagged correlation analysis (job: ${jobId})`);

  try {
    // Get eligible users
    const eligibleUsers = await getUsersWithMinMeals(CONFIG.MIN_DAYS_FOR_LAG * 2);

    console.log(`[ML Job] Eligible users for lagged analysis: ${eligibleUsers.length}`);

    const results = {
      processed: 0,
      significantFindings: [],
      errors: [],
    };

    for (let i = 0; i < eligibleUsers.length; i += CONFIG.BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + CONFIG.BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async user => {
          try {
            const analysis = await analyzeAllSignalPairs(user.userId, {
              days: 30,
              maxLag: 3,
            });

            const significant = analysis.filter(r => r.isSignificant);
            if (significant.length > 0) {
              return {
                userId: user.userId,
                findings: significant.slice(0, 3), // Top 3 findings
              };
            }
            return null;
          } catch (error) {
            return { userId: user.userId, error: error.message };
          }
        })
      );

      for (const r of batchResults) {
        if (r === null) {
          results.processed++;
        } else if (r.error) {
          results.errors.push(r);
        } else {
          results.significantFindings.push(r);
          results.processed++;
        }
      }

      await sleep(CONFIG.BATCH_DELAY_MS);
    }

    const duration = Date.now() - startTime;

    console.log(`[ML Job] Weekly lagged correlation complete (job: ${jobId})`);
    console.log(`[ML Job] Users with significant findings: ${results.significantFindings.length}`);
    console.log(`[ML Job] Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      jobId,
      jobType: 'weekly_lagged_correlations',
      success: true,
      summary: {
        usersAnalyzed: results.processed,
        usersWithFindings: results.significantFindings.length,
        errors: results.errors.length,
        duration,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[ML Job] Weekly lagged correlation failed (job: ${jobId}):`, error);
    return {
      jobId,
      jobType: 'weekly_lagged_correlations',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================
 * MONTHLY JOBS
 * ============================================
 */

/**
 * Monthly Feature Interaction Analysis
 * Identifies synergistic and antagonistic effects between health behaviors
 *
 * Frequency: Monthly (first day of month recommended)
 * Duration: ~10-15 minutes for 1000 users
 *
 * Behavioral Note: Results shown to users as "combination insights" rather than complex statistics
 */
export async function runMonthlyInteractionAnalysis() {
  const startTime = Date.now();
  const jobId = `monthly_interaction_${Date.now()}`;

  console.log(`[ML Job] Starting monthly interaction analysis (job: ${jobId})`);

  try {
    // Get eligible users
    const eligibleUsers = await getUsersWithMinMeals(CONFIG.MIN_DAYS_FOR_INTERACTIONS * 2);

    console.log(`[ML Job] Eligible users for interaction analysis: ${eligibleUsers.length}`);

    const results = {
      processed: 0,
      synergies: 0,
      antagonisms: 0,
      errors: [],
    };

    for (let i = 0; i < eligibleUsers.length; i += CONFIG.BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + CONFIG.BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async user => {
          try {
            const interactions = await analyzeAllInteractions(user.userId, {
              windowDays: 60,
              minObservations: 10,
            });

            return {
              userId: user.userId,
              synergies: interactions.filter(i => i.interactionType === 'synergistic').length,
              antagonisms: interactions.filter(i => i.interactionType === 'antagonistic').length,
            };
          } catch (error) {
            return { userId: user.userId, error: error.message };
          }
        })
      );

      for (const r of batchResults) {
        if (r.error) {
          results.errors.push(r);
        } else {
          results.processed++;
          results.synergies += r.synergies;
          results.antagonisms += r.antagonisms;
        }
      }

      await sleep(CONFIG.BATCH_DELAY_MS);
    }

    const duration = Date.now() - startTime;

    console.log(`[ML Job] Monthly interaction analysis complete (job: ${jobId})`);
    console.log(`[ML Job] Total synergies found: ${results.synergies}`);
    console.log(`[ML Job] Total antagonisms found: ${results.antagonisms}`);
    console.log(`[ML Job] Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      jobId,
      jobType: 'monthly_interaction_analysis',
      success: true,
      summary: {
        usersAnalyzed: results.processed,
        totalSynergies: results.synergies,
        totalAntagonisms: results.antagonisms,
        errors: results.errors.length,
        duration,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[ML Job] Monthly interaction analysis failed (job: ${jobId}):`, error);
    return {
      jobId,
      jobType: 'monthly_interaction_analysis',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Monthly Model Health Report
 * Generates summary statistics about ML system performance
 *
 * Frequency: Monthly
 * Purpose: Monitoring for regulatory compliance and system health
 */
export async function generateMonthlyHealthReport() {
  const startTime = Date.now();
  const jobId = `monthly_report_${Date.now()}`;

  console.log(`[ML Job] Generating monthly health report (job: ${jobId})`);

  try {
    // Get global arm statistics
    const armStats = await getGlobalArmStatistics();

    // Calculate summary metrics
    const totalTrials = armStats.reduce((sum, a) => sum + a.totalTrials, 0);
    const totalSuccesses = armStats.reduce((sum, a) => sum + a.totalSuccesses, 0);
    const overallSuccessRate = totalTrials > 0 ? totalSuccesses / totalTrials : null;

    // Top performing arms
    const topArms = armStats
      .filter(a => a.totalTrials >= 10)
      .sort((a, b) => (b.globalSuccessRate || 0) - (a.globalSuccessRate || 0))
      .slice(0, 5);

    // Under-performing arms (may need review)
    const underPerforming = armStats
      .filter(a => a.totalTrials >= 10 && a.globalSuccessRate < 0.3)
      .map(a => a.armKey);

    const duration = Date.now() - startTime;

    const report = {
      jobId,
      jobType: 'monthly_health_report',
      reportPeriod: {
        generatedAt: new Date().toISOString(),
        dataAsOf: new Date().toISOString(),
      },
      systemHealth: {
        status: overallSuccessRate > 0.4 ? 'healthy' : 'needs_attention',
        overallAcceptanceRate: overallSuccessRate,
        totalRecommendations: totalTrials,
        totalAccepted: totalSuccesses,
      },
      armPerformance: {
        totalArms: armStats.length,
        topPerformingArms: topArms,
        armsNeedingReview: underPerforming,
      },
      compliance: {
        note: 'All ML decisions logged with audit trails',
        transparencyMetadataIncluded: true,
        statisticalMethodsDocumented: true,
      },
      duration,
    };

    console.log(`[ML Job] Monthly health report generated (job: ${jobId})`);
    console.log(`[ML Job] System health: ${report.systemHealth.status}`);
    console.log(`[ML Job] Overall acceptance rate: ${(overallSuccessRate * 100).toFixed(1)}%`);

    return report;
  } catch (error) {
    console.error(`[ML Job] Monthly health report failed (job: ${jobId}):`, error);
    return {
      jobId,
      jobType: 'monthly_health_report',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================
 * JOB SCHEDULING
 * ============================================
 */

/**
 * Initialize ML batch jobs with cron scheduling
 * Note: Uses node-cron for scheduling in production
 *
 * @param {Object} cron - node-cron instance (optional, for external scheduling)
 */
export function initMLBatchJobs() {
  // Uses CronJob from the `cron` package — the same scheduler initStreakCronJob,
  // initNutrientDeficitJob and initSmartReminderCronJob run on.
  //
  // This function used to take an injected scheduler and call `cron.schedule()`,
  // which is node-cron's API. node-cron is not a dependency of this project, so
  // there was no object that could be passed in to make it work; called with no
  // argument it returned a "jobs will run manually" notice and scheduled nothing.
  // Nothing ever called it either way, so none of these jobs have ever run on a
  // schedule — only by hand via POST /api/ml/admin/jobs/*.
  const scheduleJob = (expression, task, label) =>
    new CronJob(
      expression,
      async () => {
        console.log(`[MLBatchJobs] Running scheduled ${label}`);
        try {
          await task();
        } catch (error) {
          // Each job traps its own failures and returns a result object, so this
          // is only a backstop — but without it an unexpected throw becomes an
          // unhandled rejection that can take the whole server process down.
          console.error(`[MLBatchJobs] Scheduled ${label} threw:`, error);
        }
      },
      null,   // onComplete
      true,   // start immediately
      'UTC'
    );

  const jobs = [
    scheduleJob('0 4 * * *', runDailyOrchestration, 'daily orchestration'),
    // Sunday 01:00 rather than 03:00. At 03:00 this sat only an hour ahead of
    // the 04:00 daily orchestration below — both sweep every eligible user,
    // so a drift-detection run that overran by more than an hour (plausible
    // once this scans the real user table instead of never having run) would
    // still collide with it, the exact problem the lagged-correlations move
    // to 06:00 was meant to solve. 01:00 gives a full 3-hour buffer and keeps
    // clear of the monthly jobs at 02:00/05:00 on the 1st.
    scheduleJob('0 1 * * 0', runWeeklyDriftDetection, 'weekly drift detection'),
    // Sunday 06:00 rather than the 04:00 in the original schedule, which
    // collided head-on with the daily orchestration every Sunday. Both sweep
    // every eligible user, so overlapping them doubles peak database load for
    // no reason.
    scheduleJob('0 6 * * 0', runWeeklyLaggedCorrelations, 'weekly lagged correlations'),
    scheduleJob('0 2 1 * *', runMonthlyInteractionAnalysis, 'monthly interaction analysis'),
    scheduleJob('0 5 1 * *', generateMonthlyHealthReport, 'monthly health report'),
  ];

  console.log('[MLBatchJobs] Scheduled (UTC):');
  console.log('  - Daily orchestration: 04:00 daily');
  console.log('  - Weekly drift detection: Sunday 01:00');
  console.log('  - Weekly lagged correlations: Sunday 06:00');
  console.log('  - Monthly interaction analysis: 1st of month 02:00');
  console.log('  - Monthly health report: 1st of month 05:00');

  return jobs;
}

/**
 * Utility: Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  runDailyOrchestration,
  runWeeklyDriftDetection,
  runWeeklyLaggedCorrelations,
  runMonthlyInteractionAnalysis,
  generateMonthlyHealthReport,
  initMLBatchJobs,
};
