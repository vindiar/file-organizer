import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { popLastHistoryEntry } from '../utils/history.js';
import { logger } from '../utils/logger.js';

/**
 * Revert the last file organization operation
 */
export async function undoCommand(): Promise<void> {
  logger.header('Undo Operation');
  
  const lastEntry = popLastHistoryEntry();
  
  if (!lastEntry) {
    logger.warning('No history found. There are no operations to undo.');
    return;
  }
  
  logger.info(`Undoing operation from: ${lastEntry.timestamp}`);
  logger.info(`Target folder: ${lastEntry.targetDir}`);
  
  const spinner = ora('Restoring files...').start();
  
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];
  const directoriesToCleanup = new Set<string>();
  
  for (const op of lastEntry.operations) {
    // Check if the moved file actually exists in the organized location
    if (!fs.existsSync(op.newPath)) {
      failCount++;
      errors.push(`File not found at destination: ${path.basename(op.newPath)}`);
      continue;
    }
    
    try {
      // Ensure the original directory exists
      const originalDir = path.dirname(op.originalPath);
      if (!fs.existsSync(originalDir)) {
        fs.mkdirSync(originalDir, { recursive: true });
      }
      
      // Move back
      fs.renameSync(op.newPath, op.originalPath);
      successCount++;
      
      // Keep track of the category folder to clean it up if it becomes empty
      directoriesToCleanup.add(path.dirname(op.newPath));
    } catch (error) {
      failCount++;
      errors.push(
        `Failed to move ${path.basename(op.newPath)}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
  
  // Cleanup empty category directories
  for (const dir of directoriesToCleanup) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {
      // Ignore directory cleanup errors
    }
  }
  
  if (failCount > 0) {
    spinner.warn(`Restored ${successCount}/${lastEntry.operations.length} files (${failCount} failed)`);
    
    logger.blank();
    logger.error('Failed restorations:');
    for (const err of errors) {
      logger.error(`  ${err}`);
    }
  } else {
    spinner.succeed(`Successfully restored all ${successCount} files to their original paths`);
  }
  
  logger.blank();
  logger.success('Undo complete!');
}
