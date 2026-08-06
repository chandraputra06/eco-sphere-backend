import { execSync } from 'child_process';
export function runAutoMigration() {
  try {
    console.log('Running auto-migration...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}