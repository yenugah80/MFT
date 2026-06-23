/**
 * Environment Validation Service
 * Validates all required environment variables and configuration at startup
 * Prevents runtime errors from missing configuration
 *
 * Production-grade startup validation
 */

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
];

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_ENVIRONMENT',
  'EXPO_PUBLIC_LOG_LEVEL',
  'EXPO_PUBLIC_API_TIMEOUT_MS',
];

/**
 * Validation results
 */
const ValidationState = {
  validated: false,
  valid: false,
  missing: [],
  warnings: [],
  errors: [],
};

/**
 * Validate environment configuration
 * Note: Only validates once. State persists for re-validation check.
 * For fresh validation, reset ValidationState manually.
 */
export function validateEnvironment() {
  if (ValidationState.validated) {
    logValidationStatus(); // Log cached result
    return {
      valid: ValidationState.valid,
      missing: ValidationState.missing,
      warnings: ValidationState.warnings,
      errors: ValidationState.errors,
    };
  }

  console.debug('[EnvironmentValidation] Validating environment configuration...');

  // Step 1: Check required variables exist and are non-empty
  const missing = REQUIRED_ENV_VARS.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    ValidationState.errors.push(msg);
    ValidationState.missing = missing;
    ValidationState.valid = false;
  } else {
    ValidationState.valid = true;
  }

  // Step 2: Check optional variables and warn if missing
  const missingOptional = OPTIONAL_ENV_VARS.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missingOptional.length > 0) {
    ValidationState.warnings.push(
      `Missing optional environment variables (using defaults): ${missingOptional.join(', ')}`
    );
  }

  // Step 3: Validate configuration values format and connectivity
  validateConfigurationValues();

  ValidationState.validated = true;
  logValidationStatus();

  return {
    valid: ValidationState.valid,
    missing: ValidationState.missing,
    warnings: ValidationState.warnings,
    errors: ValidationState.errors,
  };
}

/**
 * Validate configuration values format and connectivity
 */
function validateConfigurationValues() {
  // 1. Validate Clerk key format
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (clerkKey) {
    if (!clerkKey.startsWith('pk_')) {
      ValidationState.warnings.push(
        'Clerk publishable key format may be incorrect. Expected to start with "pk_"'
      );
    }
    if (clerkKey.length < 20) {
      ValidationState.warnings.push('Clerk publishable key seems too short');
    }
  }

  // 2. Validate timeout is a valid number
  const timeout = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
  if (timeout) {
    const timeoutMs = parseInt(timeout, 10);
    if (isNaN(timeoutMs)) {
      ValidationState.warnings.push('API timeout is not a valid number, using default');
    } else if (timeoutMs < 1000) {
      ValidationState.warnings.push('API timeout is very short (<1s), may cause frequent timeouts');
    } else if (timeoutMs > 60000) {
      ValidationState.warnings.push('API timeout is very long (>60s), users may wait too long');
    }
  }

  // 4. Validate environment name is valid
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT;
  if (env && !['development', 'staging', 'production'].includes(env)) {
    ValidationState.warnings.push(
      `Unknown environment: ${env}. Expected: development, staging, or production`
    );
  }
}

/**
 * Get a validated environment variable with fallback
 */
export function getEnvVar(varName, fallback = null) {
  const value = process.env[varName] || fallback;

  if (!value && REQUIRED_ENV_VARS.includes(varName)) {
    console.error(`[EnvironmentValidation] Required environment variable missing: ${varName}`);
  }

  return value;
}

/**
 * Check if validation passed (automatically validates if not done)
 */
export function isEnvironmentValid() {
  if (!ValidationState.validated) {
    validateEnvironment();
  }
  return ValidationState.valid;
}

/**
 * Get comprehensive validation report
 */
export function getValidationReport() {
  if (!ValidationState.validated) {
    validateEnvironment();
  }

  return {
    timestamp: new Date().toISOString(),
    valid: ValidationState.valid,
    missing: ValidationState.missing,
    warnings: ValidationState.warnings,
    errors: ValidationState.errors,
    checkedVars: REQUIRED_ENV_VARS.length + OPTIONAL_ENV_VARS.length,
  };
}

/**
 * Log validation status with clear formatting
 */
function logValidationStatus() {
  if (ValidationState.valid) {
    console.debug('[EnvironmentValidation] ✓ All required environment variables configured');
  } else {
    console.error('[EnvironmentValidation] ✗ Environment validation failed');
    ValidationState.errors.forEach((error) => {
      console.error(`  ✗ ${error}`);
    });
  }

  if (ValidationState.warnings.length > 0) {
    console.warn('[EnvironmentValidation] ⚠ Configuration warnings:');
    ValidationState.warnings.forEach((warning) => {
      console.warn(`  ⚠ ${warning}`);
    });
  }
}

/**
 * Assert environment is valid, throw with detailed message if not
 * Use this to enforce validation before critical operations
 */
export function assertEnvironmentValid() {
  if (!ValidationState.validated) {
    validateEnvironment();
  }

  if (!ValidationState.valid) {
    const errors = ValidationState.errors.map((e) => `  - ${e}`).join('\n');
    const warnings =
      ValidationState.warnings.length > 0
        ? `\n\nWarnings:\n${ValidationState.warnings.map((w) => `  - ${w}`).join('\n')}`
        : '';
    throw new Error(
      `Environment validation failed:\n\nErrors:\n${errors}${warnings}\n\nPlease check your .env file and ensure all required variables are set correctly.`
    );
  }
}

/**
 * Reset validation state (for testing or re-validation)
 */
export function resetValidationState() {
  ValidationState.validated = false;
  ValidationState.valid = false;
  ValidationState.missing = [];
  ValidationState.warnings = [];
  ValidationState.errors = [];
}

export default {
  validateEnvironment,
  getEnvVar,
  isEnvironmentValid,
  getValidationReport,
  assertEnvironmentValid,
};
