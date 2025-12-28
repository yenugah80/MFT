// Migration Runner - Execute SQL migration files
import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Running migration: ${migrationFile}`);
    console.log('='.repeat(50));

    // Remove comments and split SQL file by semicolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove comment lines
      .join('\n');

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

        await db.execute(sql.raw(statement));
        console.log('✅ Success');
        successCount++;
      } catch (error) {
        // Log but don't fail if column/table already exists, etc.
        if (
          error.message.includes('already exists') ||
          error.cause?.message.includes('already exists') ||
          error.cause?.code === '42P07' || // duplicate_table
          error.cause?.code === '42701'    // duplicate_column
        ) {
          console.log('⚠️ Already exists, skipping');
          skippedCount++;
        } else {
          console.error('❌ Error:', error.cause?.message || error.message);
          throw error;
        }
      }
    }

    console.log(`\n📊 Summary: ${successCount} executed, ${skippedCount} skipped`);

    console.log('='.repeat(50));
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
  }
}

// Run migrations
async function main() {
  try {
    // Run any pending migrations
    await runMigration('0017_add_lottie_animations.sql');
    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

main();
