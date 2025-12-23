import path from 'path';
import ora from 'ora';
import inquirer from 'inquirer';
import { scanDirectory, formatFileSize } from '../services/scanner.js';
import { categorizeFiles, categorizeByExtension } from '../services/ai.js';
import { organizeFiles, getOrganizeSummary } from '../services/organizer.js';
import { logger } from '../utils/logger.js';
import { getApiKey } from '../utils/config.js';
import { OrganizeOptions } from '../types/index.js';

export async function organizeCommand(
  folder: string,
  options: OrganizeOptions
): Promise<void> {
  const targetDir = path.resolve(folder);
  
  logger.header('AI File Organizer');
  logger.info(`Target folder: ${targetDir}`);
  
  // Step 1: Scan files
  const scanSpinner = ora('Scanning files...').start();
  
  try {
    const files = await scanDirectory(targetDir, {
      recursive: options.recursive,
      extensions: options.extensions
    });
    
    if (files.length === 0) {
      scanSpinner.warn('No files found in the specified directory');
      return;
    }
    
    scanSpinner.succeed(`Found ${files.length} files`);
    
    // Show file summary
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    logger.info(`Total size: ${formatFileSize(totalSize)}`);
    
    // Step 2: Categorize files
    const catSpinner = ora('Categorizing files with AI...').start();
    
    let categorized;
    const hasApiKey = getApiKey();
    
    if (hasApiKey) {
      try {
        categorized = await categorizeFiles(files);
        catSpinner.succeed('Files categorized using AI');
      } catch (error) {
        catSpinner.warn('AI categorization failed, using extension-based fallback');
        categorized = categorizeByExtension(files);
      }
    } else {
      catSpinner.info('No API key found, using extension-based categorization');
      categorized = categorizeByExtension(files);
    }
    
    // Show category summary
    const categoryCount = new Map<string, number>();
    for (const item of categorized) {
      const count = categoryCount.get(item.category) || 0;
      categoryCount.set(item.category, count + 1);
    }
    
    logger.blank();
    logger.info('Categories:');
    for (const [category, count] of categoryCount) {
      logger.category(category, count);
    }
    
    // Step 3: Confirm if interactive mode
    if (options.interactive && !options.dryRun) {
      logger.blank();
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with organizing files?',
          default: true
        }
      ]);
      
      if (!confirm) {
        logger.warning('Operation cancelled');
        return;
      }
    }
    
    // Step 4: Organize files
    if (options.dryRun) {
      logger.blank();
      logger.warning('DRY RUN - No files will be moved');
      logger.blank();
      
      for (const item of categorized) {
        const outputDir = options.output || path.join(targetDir, 'Organized');
        const destPath = path.join(outputDir, item.category, item.file.name);
        logger.file(item.file.name, destPath, item.category);
      }
    } else {
      const orgSpinner = ora('Organizing files...').start();
      
      const results = await organizeFiles(categorized, targetDir, {
        outputDir: options.output,
        dryRun: false
      });
      
      const summary = getOrganizeSummary(results);
      
      if (summary.failed > 0) {
        orgSpinner.warn(`Organized ${summary.success}/${summary.total} files (${summary.failed} failed)`);
      } else {
        orgSpinner.succeed(`Successfully organized ${summary.success} files`);
      }
      
      // Show results
      logger.blank();
      logger.info('Results by category:');
      for (const [category, count] of summary.byCategory) {
        logger.category(category, count);
      }
      
      // Show failed files
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        logger.blank();
        logger.error('Failed to move:');
        for (const f of failed) {
          logger.error(`  ${f.file.name}: ${f.error}`);
        }
      }
    }
    
    logger.blank();
    logger.success('Done!');
    
  } catch (error) {
    scanSpinner.fail('Error');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
