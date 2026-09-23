import { db } from './src/db/index.js';
import { profilesTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const userId = process.argv[2];
const rows = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
