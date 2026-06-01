import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FileInfo } from '../types/index.js';

export interface ScanOptions {
  recursive?: boolean;
  extensions?: string[];
}

/**
 * Scan a directory and return file information
 */
export async function scanDirectory(
  dirPath: string,
  options: ScanOptions = {}
): Promise<FileInfo[]> {
  const { recursive = false, extensions } = options;
  const files: FileInfo[] = [];
  
  const absolutePath = path.resolve(dirPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory not found: ${absolutePath}`);
  }
  
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${absolutePath}`);
  }
  
  await scanRecursive(absolutePath, files, recursive, extensions);
  
  return files;
}

async function scanRecursive(
  dirPath: string,
  files: FileInfo[],
  recursive: boolean,
  extensions?: string[]
): Promise<void> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && recursive) {
      await scanRecursive(fullPath, files, recursive, extensions);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      
      // Filter by extension if specified
      if (extensions && extensions.length > 0) {
        const normalizedExtensions = extensions.map(e => 
          e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`
        );
        if (!normalizedExtensions.includes(ext)) {
          continue;
        }
      }
      
      const stats = fs.statSync(fullPath);
      
      files.push({
        name: entry.name,
        path: fullPath,
        extension: ext,
        size: stats.size,
        modifiedAt: stats.mtime
      });
    }
  }
}

/**
 * Calculate the MD5 hash of a file using streams to prevent high memory usage on large files
 */
export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
