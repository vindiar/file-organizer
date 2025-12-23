import fs from 'fs';
import path from 'path';
import { CategoryResult, OrganizeResult } from '../types/index.js';

export interface OrganizeOptions {
  outputDir?: string;
  dryRun?: boolean;
}

/**
 * Organize files into category folders
 */
export async function organizeFiles(
  categorizedFiles: CategoryResult[],
  sourceDir: string,
  options: OrganizeOptions = {}
): Promise<OrganizeResult[]> {
  const { outputDir, dryRun = false } = options;
  const results: OrganizeResult[] = [];
  
  // Use output directory or create "Organized" folder in source
  const baseOutputDir = outputDir || path.join(sourceDir, 'Organized');
  
  // Group files by category
  const byCategory = new Map<string, CategoryResult[]>();
  for (const item of categorizedFiles) {
    const existing = byCategory.get(item.category) || [];
    existing.push(item);
    byCategory.set(item.category, existing);
  }
  
  // Create category folders and move files
  for (const [category, files] of byCategory) {
    const categoryDir = path.join(baseOutputDir, category);
    
    // Create directory if not dry run
    if (!dryRun && !fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    for (const { file } of files) {
      const destPath = path.join(categoryDir, file.name);
      const finalDestPath = getUniqueDestPath(destPath, dryRun);
      
      try {
        if (!dryRun) {
          // Move the file
          fs.renameSync(file.path, finalDestPath);
        }
        
        results.push({
          success: true,
          file,
          fromPath: file.path,
          toPath: finalDestPath,
          category
        });
      } catch (error) {
        results.push({
          success: false,
          file,
          fromPath: file.path,
          toPath: finalDestPath,
          category,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
  
  return results;
}

/**
 * Get unique destination path to avoid overwriting
 */
function getUniqueDestPath(destPath: string, dryRun: boolean): string {
  if (dryRun || !fs.existsSync(destPath)) {
    return destPath;
  }
  
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const baseName = path.basename(destPath, ext);
  
  let counter = 1;
  let newPath = destPath;
  
  while (fs.existsSync(newPath)) {
    newPath = path.join(dir, `${baseName} (${counter})${ext}`);
    counter++;
  }
  
  return newPath;
}

/**
 * Get summary of organization results
 */
export function getOrganizeSummary(results: OrganizeResult[]): {
  total: number;
  success: number;
  failed: number;
  byCategory: Map<string, number>;
} {
  const byCategory = new Map<string, number>();
  let success = 0;
  let failed = 0;
  
  for (const result of results) {
    if (result.success) {
      success++;
      const count = byCategory.get(result.category) || 0;
      byCategory.set(result.category, count + 1);
    } else {
      failed++;
    }
  }
  
  return {
    total: results.length,
    success,
    failed,
    byCategory
  };
}
