import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, DEFAULT_CATEGORIES } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.file-organizer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaultConfig: Config = {
  apiKey: undefined,
  defaultCategories: DEFAULT_CATEGORIES,
  model: 'gemini-1.5-flash'
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();
  
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...defaultConfig };
  }
  
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const saved = JSON.parse(content);
    return { ...defaultConfig, ...saved };
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: Partial<Config>): void {
  ensureConfigDir();
  
  const current = loadConfig();
  const updated = { ...current, ...config };
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
}

export function getApiKey(): string | undefined {
  // 1. Check environment variable
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  
  // 2. Check .env file in current directory
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  
  // 3. Check saved config
  const config = loadConfig();
  return config.apiKey;
}

export function setApiKey(key: string): void {
  saveConfig({ apiKey: key });
}
