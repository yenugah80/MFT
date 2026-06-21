import "dotenv/config";

const REQUIRED_VARS = ["DATABASE_URL"];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[ENV] ❌ Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

validateEnv();

export const ENV = {
  PORT: parseInt(process.env.PORT || "5001", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  HEALTH_TOKEN: process.env.HEALTH_TOKEN,
  IS_PRODUCTION: process.env.NODE_ENV === "production",
};