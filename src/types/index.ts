// File information for scanning
export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  modifiedAt: Date;
  hash?: string; // MD5 hash for duplicate detection
}

// Category assigned by AI
export interface CategoryResult {
  file: FileInfo;
  category: string;
  confidence: number;
  reason?: string;
  newName?: string; // Suggested clean name (smart rename)
  isDuplicate?: boolean;
}

// Organization result
export interface OrganizeResult {
  success: boolean;
  file: FileInfo;
  fromPath: string;
  toPath: string;
  category: string;
  newName?: string;
  error?: string;
}

// CLI options
export interface OrganizeOptions {
  output?: string;
  dryRun?: boolean;
  interactive?: boolean;
  recursive?: boolean;
  extensions?: string[];
  smartRename?: boolean;
  multimodal?: boolean;
  detectDuplicates?: boolean;
  dateFormat?: string;
  report?: boolean;
}

// Configuration
export interface Config {
  provider: 'gemini' | 'openrouter' | 'groq';
  apiKey?: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  groqApiKey?: string;
  defaultCategories: string[];
  model: string;
}

// History of file organization for undoing
export interface FileMoveOperation {
  originalPath: string;
  newPath: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  targetDir: string;
  operations: FileMoveOperation[];
}

// Default categories for file organization
export const DEFAULT_CATEGORIES = [
  'Images',
  'Documents',
  'Videos',
  'Music',
  'Archives',
  'Code',
  'Spreadsheets',
  'Presentations',
  'PDFs',
  'Others'
];

// Extension mappings for quick categorization
export const EXTENSION_MAP: Record<string, string> = {
  // Images
  '.jpg': 'Images',
  '.jpeg': 'Images',
  '.png': 'Images',
  '.gif': 'Images',
  '.bmp': 'Images',
  '.svg': 'Images',
  '.webp': 'Images',
  '.ico': 'Images',
  '.heic': 'Images',
  '.heif': 'Images',
  '.raw': 'Images',
  '.tiff': 'Images',
  '.psd': 'Images',
  
  // Documents
  '.doc': 'Documents',
  '.docx': 'Documents',
  '.txt': 'Documents',
  '.rtf': 'Documents',
  '.odt': 'Documents',
  '.md': 'Documents',
  
  // Videos
  '.mp4': 'Videos',
  '.avi': 'Videos',
  '.mkv': 'Videos',
  '.mov': 'Videos',
  '.wmv': 'Videos',
  '.flv': 'Videos',
  '.webm': 'Videos',
  '.m4v': 'Videos',
  
  // Music
  '.mp3': 'Music',
  '.wav': 'Music',
  '.flac': 'Music',
  '.aac': 'Music',
  '.ogg': 'Music',
  '.wma': 'Music',
  '.m4a': 'Music',
  
  // Archives
  '.zip': 'Archives',
  '.rar': 'Archives',
  '.7z': 'Archives',
  '.tar': 'Archives',
  '.gz': 'Archives',
  '.bz2': 'Archives',
  
  // Code
  '.js': 'Code',
  '.ts': 'Code',
  '.py': 'Code',
  '.java': 'Code',
  '.cpp': 'Code',
  '.c': 'Code',
  '.h': 'Code',
  '.css': 'Code',
  '.html': 'Code',
  '.php': 'Code',
  '.rb': 'Code',
  '.go': 'Code',
  '.rs': 'Code',
  '.swift': 'Code',
  '.kt': 'Code',
  '.json': 'Code',
  '.xml': 'Code',
  '.yaml': 'Code',
  '.yml': 'Code',
  
  // Spreadsheets
  '.xls': 'Spreadsheets',
  '.xlsx': 'Spreadsheets',
  '.csv': 'Spreadsheets',
  '.ods': 'Spreadsheets',
  
  // Presentations
  '.ppt': 'Presentations',
  '.pptx': 'Presentations',
  '.odp': 'Presentations',
  '.key': 'Presentations',
  
  // PDFs
  '.pdf': 'PDFs',
};
