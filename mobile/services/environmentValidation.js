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
  'EXPO_PUBLIC_API_BASE_URL',
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
 */
export function validateEnvironment() {
  if (ValidationState.validated) {
    return {
      valid: ValidationState.valid,
      missing: ValidationState.missing,
      warnings: ValidationState.warnings,
      errors: ValidationState.errors,
    };
  }

  console.debug('[EnvironmentValidation] Validating environment configuration...');

  // Check required variables
  const missing = REQUIRED_ENV_VARS.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    ValidationState.errors.push(`Missing required environment variables: ${missing.join(', ')}`);
    ValidationState.missing = missing;
    ValidationState.valid = false;
  } else {
    ValidationState.valid = true;
  }

  // Check optional variables and warn if missing
  const missingOptional = OPTIONAL_ENV_VARS.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missingOptional.length > 0) {
    ValidationState.warnings.push(`Missing optional environment variables (using defaults): ${missingOptional.join(', ')}`);
  }

  // Validate values format
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
 * Validate configuration values
 */
function validateConfigurationValues() {
  // Validate Clerk key format
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (clerkKey && !clerkKey.startsWith('pk_')) {
    ValidationState.warnings.push(
      'Clerk publishable key format may be incorrect. Expected to start with "pk_"'
    );
  }

  // Validate API base URL format
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (apiUrl && !apiUrl.startsWith('http')) {
    ValidationState.errors.push('API base URL must start with http:// or https://');
  }

  // Validate timeout is a number
  const timeout = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
  if (timeout && isNaN(parseInt(timeout, 10))) {
    ValidationState.warnings.push('API timeout is not a valid number, using default');
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
 * Check if validation passed
 */
export function isEnvironmentValid() {
  if (!ValidationState.validated) {
    validateEnvironment();
  }
  return ValidationState.valid;
}

/**
 * Get validation report
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
 * Log validation status
 */
function logValidationStatus() {
  if (ValidationState.valid) {
    console.debug('[EnvironmentValidation] ✓ All required environment variables configured');
  } else {
    console.error('[EnvironmentValidation] ✗ Environment validation failed');
    ValidationState.errors.forEach((error) => console.error(`  - ${error}`));
  }

  if (ValidationState.warnings.length > 0) {
    console.warn('[EnvironmentValidation] ⚠️ Configuration warnings:');
    ValidationState.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
}

/**
 * Assert environment is valid, throw if not
 */
export function assertEnvironmentValid() {
  if (!isEnvironmentValid()) {
    const errors = ValidationState.errors.join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
}

export default {
  validateEnvironment,
  getEnvVar,
  isEnvironmentValid,
  getValidationReport,
  assertEnvironmentValid,
};
