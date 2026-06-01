import fs from 'fs';
import path from 'path';
import os from 'os';
import { HistoryEntry } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.file-organizer');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const MAX_HISTORY_LENGTH = 10;

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load all history entries from the history.json file
 */
export function loadHistory(): HistoryEntry[] {
  ensureConfigDir();

  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content) as HistoryEntry[];
  } catch (error) {
    // If the file is corrupted, return empty history
    return [];
  }
}

/**
 * Save history entries to the history.json file
 */
export function saveHistory(entries: HistoryEntry[]): void {
  ensureConfigDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), { mode: 0o600 });
}

/**
 * Push a new history entry to the log, keeping only the last MAX_HISTORY_LENGTH entries
 */
export function pushHistoryEntry(entry: HistoryEntry): void {
  const history = loadHistory();
  
  // Add new entry to the end
  history.push(entry);
  
  // Keep only the last MAX_HISTORY_LENGTH entries
  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift();
  }
  
  saveHistory(history);
}

/**
 * Pop the latest history entry from the log, removing it from the file
 */
export function popLastHistoryEntry(): HistoryEntry | null {
  const history = loadHistory();
  
  if (history.length === 0) {
    return null;
  }
  
  const lastEntry = history.pop()!;
  saveHistory(history);
  
  return lastEntry;
}
