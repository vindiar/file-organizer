import path from 'path';
import fs from 'fs';
import ora from 'ora';
import inquirer from 'inquirer';
import { scanDirectory, formatFileSize, calculateFileHash } from '../services/scanner.js';
import { categorizeFiles, categorizeByExtension } from '../services/ai.js';
import { organizeFiles, getOrganizeSummary } from '../services/organizer.js';
import { logger } from '../utils/logger.js';
import { loadConfig, getApiKey } from '../utils/config.js';
import { pushHistoryEntry } from '../utils/history.js';
import { generateHtmlReport, ReportStats } from '../services/report.js';
import { OrganizeOptions, FileInfo, CategoryResult, OrganizeResult, HistoryEntry } from '../types/index.js';

/**
 * Format a date into YYYY-MM, YYYY, etc. for subfolder mapping
 */
function getSubfolderForDate(date: Date, format: string): string {
  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const normalized = format.toUpperCase();
  if (normalized === 'YYYY-MM') {
    return `${yyyy}-${mm}`;
  } else if (normalized === 'YYYY') {
    return yyyy;
  } else if (normalized === 'YYYY-MM-DD') {
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

/**
 * Group files and identify duplicates using MD5 hashing (only on identical sizes)
 */
async function identifyDuplicates(files: FileInfo[]): Promise<{ uniques: FileInfo[], duplicates: FileInfo[] }> {
  const uniques: FileInfo[] = [];
  const duplicates: FileInfo[] = [];
  
  // Group files by size to avoid hashing unique files
  const sizeMap = new Map<number, FileInfo[]>();
  for (const f of files) {
    const list = sizeMap.get(f.size) || [];
    list.push(f);
    sizeMap.set(f.size, list);
  }
  
  const hashMap = new Set<string>();
  
  for (const [_, list] of sizeMap) {
    if (list.length === 1) {
      uniques.push(list[0]);
    } else {
      for (const file of list) {
        try {
          const hash = await calculateFileHash(file.path);
          file.hash = hash;
          
          if (hashMap.has(hash)) {
            duplicates.push(file);
          } else {
            hashMap.add(hash);
            uniques.push(file);
          }
        } catch {
          uniques.push(file); // fallback as unique if hash fails
        }
      }
    }
  }
  
  return { uniques, duplicates };
}

export async function organizeCommand(
  folder: string,
  options: OrganizeOptions
): Promise<void> {
  const targetDir = path.resolve(folder);
  const startTime = Date.now();
  
  logger.header('AI File Organizer');
  logger.info(`Target folder: ${targetDir}`);
  
  // Step 1: Scan files
  const scanSpinner = ora('Scanning files...').start();
  let files: FileInfo[] = [];
  
  try {
    files = await scanDirectory(targetDir, {
      recursive: options.recursive,
      extensions: options.extensions
    });
    
    if (files.length === 0) {
      scanSpinner.warn('No files found in the specified directory');
      return;
    }
    
    scanSpinner.succeed(`Found ${files.length} files`);
  } catch (error) {
    scanSpinner.fail('Scan failed');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return;
  }
  
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const config = loadConfig();
  
  // Draw premium Bento-style scan summary
  logger.blank();
  logger.drawPanel('SCAN SUMMARY', [
    `📂 Folder Target : ${targetDir}`,
    `🗂️ Total File    : ${files.length} files`,
    `⚖️ Ukuran Total  : ${formatFileSize(totalSize)}`,
    `🤖 AI Provider   : ${config.provider.toUpperCase()} (${config.model})`,
    `🔧 Options       : [Recursive: ${options.recursive ? 'Yes' : 'No'}] [Duplicates: ${options.detectDuplicates ? 'On' : 'Off'}]`
  ]);
  logger.blank();
  
  let filesToProcess = [...files];
  let duplicateResults: CategoryResult[] = [];
  
  // Step 2: Hashing & Duplicate detection (Local)
  if (options.detectDuplicates) {
    const dupSpinner = ora('Checking for duplicate files...').start();
    const { uniques, duplicates } = await identifyDuplicates(files);
    
    filesToProcess = uniques;
    duplicateResults = duplicates.map(f => ({
      file: f,
      category: 'Duplicates',
      confidence: 1.0,
      reason: 'Duplicate file detected via MD5 checksum matching',
      isDuplicate: true
    }));
    
    if (duplicates.length > 0) {
      dupSpinner.succeed(`Found ${duplicates.length} duplicate files (grouped for deduplication)`);
    } else {
      dupSpinner.succeed('No duplicate files found');
    }
  }
  
  // Step 3: Categorize files
  const catSpinner = ora('Categorizing files with AI...').start();
  let categorized: CategoryResult[] = [];
  const hasApiKey = getApiKey();
  
  if (hasApiKey) {
    try {
      categorized = await categorizeFiles(filesToProcess, {
        smartRename: options.smartRename,
        multimodal: options.multimodal
      });
      catSpinner.succeed('Files categorized using AI');
    } catch (error) {
      catSpinner.warn('AI categorization failed, using local extension fallback');
      categorized = categorizeByExtension(filesToProcess);
    }
  } else {
    catSpinner.info('No API key found, using extension-based categorization');
    categorized = categorizeByExtension(filesToProcess);
  }
  
  // Merge duplicates back if any
  categorized = [...categorized, ...duplicateResults];
  
  // Apply Date formatting subfolders if requested
  if (options.dateFormat) {
    for (const item of categorized) {
      if (item.category !== 'Others' && item.category !== 'Duplicates') {
        const dateSub = getSubfolderForDate(item.file.modifiedAt, options.dateFormat);
        if (dateSub) {
          item.category = path.join(item.category, dateSub);
        }
      }
    }
  }
  
  // Show category preview panel
  const categoryCount = new Map<string, number>();
  for (const item of categorized) {
    const rootCategory = item.category.split(path.sep)[0];
    const count = categoryCount.get(rootCategory) || 0;
    categoryCount.set(rootCategory, count + 1);
  }
  
  logger.blank();
  logger.info('Proposed Categories:');
  for (const [category, count] of categoryCount) {
    logger.category(category, count);
  }
  
  // Step 4: Interactive file selection checklist
  if (options.interactive && !options.dryRun) {
    logger.blank();
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedItems',
        message: 'Select files to organize:',
        choices: categorized.map(item => {
          const renameText = item.newName && item.newName !== item.file.name
            ? ` (rename: ${item.newName})`
            : '';
          const dupLabel = item.isDuplicate ? '[DUP] ' : '';
          return {
            name: `${dupLabel}${item.file.name} -> ${item.category}${renameText}`,
            value: item,
            checked: !item.isDuplicate // keep duplicates unchecked by default
          };
        }),
        pageSize: 15
      }
    ]);
    
    if (answers.selectedItems.length === 0) {
      logger.warning('No files selected. Operation cancelled.');
      return;
    }
    
    categorized = answers.selectedItems;
  }
  
  // Step 5: Execute organization
  if (options.dryRun) {
    logger.blank();
    logger.warning('DRY RUN - No files will be moved');
    logger.blank();
    
    for (const item of categorized) {
      const outputDir = options.output || path.join(targetDir, 'Organized');
      const filename = item.newName || item.file.name;
      const destPath = path.join(outputDir, item.category, filename);
      logger.file(item.file.name, destPath, item.category, item.newName);
    }
    
    // Generate dry-run report
    if (options.report) {
      const dryResults: OrganizeResult[] = categorized.map(item => {
        const outputDir = options.output || path.join(targetDir, 'Organized');
        const filename = item.newName || item.file.name;
        return {
          success: true,
          file: item.file,
          fromPath: item.file.path,
          toPath: path.join(outputDir, item.category, filename),
          category: item.category,
          newName: item.newName
        };
      });
      
      const reportStats: ReportStats = {
        provider: config.provider,
        model: config.model,
        totalFiles: dryResults.length,
        totalSize: totalSize,
        executionTime: new Date().toLocaleString(),
        durationMs: Date.now() - startTime,
        successCount: dryResults.length,
        failCount: 0
      };
      
      const reportPath = await generateHtmlReport(targetDir, dryResults, reportStats);
      logger.blank();
      logger.success(`Dry run report generated: ${reportPath}`);
    }
  } else {
    const orgSpinner = ora('Organizing files...').start();
    
    // Override filenames inside category results for organizer
    const modifiedCategorized = categorized.map(item => {
      if (item.newName) {
        // Temporarily override filename for organizing function
        const clonedFile = { ...item.file, name: item.newName };
        return { ...item, file: clonedFile, originalName: item.file.name };
      }
      return item;
    });
    
    const results = await organizeFiles(modifiedCategorized, targetDir, {
      outputDir: options.output,
      dryRun: false
    });
    
    // Re-map original names to results for reporting
    const finalizedResults: OrganizeResult[] = results.map((res, index) => {
      const orig = categorized[index];
      return {
        ...res,
        file: orig.file, // keep original file info
        newName: orig.newName
      };
    });
    
    const summary = getOrganizeSummary(finalizedResults);
    
    if (summary.failed > 0) {
      orgSpinner.warn(`Organized ${summary.success}/${summary.total} files (${summary.failed} failed)`);
    } else {
      orgSpinner.succeed(`Successfully organized ${summary.success} files`);
    }
    
    // Show results
    logger.blank();
    logger.info('Results by category:');
    for (const [category, count] of summary.byCategory) {
      const rootCat = category.split(path.sep)[0];
      logger.category(rootCat, count);
    }
    
    // Log failed
    const failed = finalizedResults.filter(r => !r.success);
    if (failed.length > 0) {
      logger.blank();
      logger.error('Failed to move:');
      for (const f of failed) {
        logger.error(`  ${f.file.name}: ${f.error}`);
      }
    }
    
    // Save history entry for undo command
    const successfulOps = finalizedResults
      .filter(r => r.success)
      .map(r => ({
        originalPath: r.fromPath,
        newPath: r.toPath
      }));
      
    if (successfulOps.length > 0) {
      const historyEntry: HistoryEntry = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toLocaleString(),
        targetDir: targetDir,
        operations: successfulOps
      };
      pushHistoryEntry(historyEntry);
    }
    
    // Generate HTML report if requested
    if (options.report) {
      const reportStats: ReportStats = {
        provider: config.provider,
        model: config.model,
        totalFiles: finalizedResults.length,
        totalSize: totalSize,
        executionTime: new Date().toLocaleString(),
        durationMs: Date.now() - startTime,
        successCount: summary.success,
        failCount: summary.failed
      };
      
      const reportPath = await generateHtmlReport(targetDir, finalizedResults, reportStats);
      logger.blank();
      logger.success(`Dashboard visual report generated at: ${reportPath}`);
    }
  }
  
  logger.blank();
  logger.success('Done!');
}
