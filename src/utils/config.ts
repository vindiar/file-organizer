import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, DEFAULT_CATEGORIES } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.file-organizer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaultConfig: Config = {
  provider: 'gemini',
  apiKey: undefined,
  geminiApiKey: undefined,
  openRouterApiKey: undefined,
  groqApiKey: undefined,
  defaultCategories: DEFAULT_CATEGORIES,
  model: 'gemini-1.5-flash'
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
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
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), { mode: 0o600 });
}

/**
 * Get active API key based on the configured provider
 */
export function getApiKey(): string | undefined {
  const config = loadConfig();
  return getProviderApiKey(config.provider);
}

/**
 * Get API key for a specific provider, checking env vars first
 */
export function getProviderApiKey(provider: 'gemini' | 'openrouter' | 'groq'): string | undefined {
  // 1. Check environment variables
  const envKeyName = `${provider.toUpperCase()}_API_KEY`;
  if (process.env[envKeyName]) {
    return process.env[envKeyName];
  }
  
  // 2. Check .env file in current directory
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${envKeyName}=(.+)`));
    if (match) {
      return match[1].trim();
    }
  }
  
  // 3. Check saved config
  const config = loadConfig();
  if (provider === 'gemini') {
    return config.geminiApiKey || config.apiKey; // apiKey is for backward compatibility
  } else if (provider === 'openrouter') {
    return config.openRouterApiKey;
  } else if (provider === 'groq') {
    return config.groqApiKey;
  }
  
  return undefined;
}

export function setApiKey(key: string): void {
  const config = loadConfig();
  if (config.provider === 'gemini') {
    saveConfig({ geminiApiKey: key, apiKey: key });
  } else if (config.provider === 'openrouter') {
    saveConfig({ openRouterApiKey: key });
  } else if (config.provider === 'groq') {
    saveConfig({ groqApiKey: key });
  }
}
