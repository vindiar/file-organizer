import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { loadConfig, saveConfig, getProviderApiKey } from '../utils/config.js';

export async function configCommand(action?: string, key?: string, value?: string): Promise<void> {
  if (action === 'set' && key && value) {
    const config = loadConfig();
    
    if (key === 'provider') {
      const normalized = value.toLowerCase();
      if (['gemini', 'openrouter', 'groq'].includes(normalized)) {
        saveConfig({ provider: normalized as any });
        logger.success(`Active provider set to: ${normalized}`);
      } else {
        logger.error(`Invalid provider: ${value}. Choose one of: gemini, openrouter, groq`);
      }
    } else if (key === 'apiKey' || key === 'api-key') {
      // Set API key for the current active provider
      const provider = config.provider;
      const keyName = `${provider}ApiKey` as 'geminiApiKey' | 'openRouterApiKey' | 'groqApiKey';
      
      saveConfig({ [keyName]: value, apiKey: provider === 'gemini' ? value : config.apiKey });
      logger.success(`API key for active provider '${provider}' saved successfully`);
    } else if (['geminiApiKey', 'openRouterApiKey', 'groqApiKey'].includes(key)) {
      saveConfig({ [key]: value });
      logger.success(`API key for key '${key}' saved successfully`);
    } else if (key === 'model') {
      saveConfig({ model: value });
      logger.success(`Default model set to: ${value}`);
    } else {
      logger.error(`Unknown config key: ${key}`);
      logger.info('Available keys: provider, apiKey, geminiApiKey, openRouterApiKey, groqApiKey, model');
    }
    return;
  }
  
  if (action === 'get' && key) {
    const config = loadConfig();
    
    if (key === 'provider') {
      logger.info(`Active Provider: ${config.provider}`);
    } else if (key === 'apiKey' || key === 'api-key') {
      const activeKey = getProviderApiKey(config.provider);
      if (activeKey) {
        const masked = activeKey.slice(0, 8) + '...' + activeKey.slice(-4);
        logger.info(`Active API Key (${config.provider}): ${masked}`);
      } else {
        logger.warning(`API Key for active provider '${config.provider}' is not set`);
      }
    } else if (['geminiApiKey', 'openRouterApiKey', 'groqApiKey'].includes(key)) {
      const currentVal = config[key as 'geminiApiKey' | 'openRouterApiKey' | 'groqApiKey'];
      if (currentVal) {
        const masked = currentVal.slice(0, 8) + '...' + currentVal.slice(-4);
        logger.info(`${key}: ${masked}`);
      } else {
        logger.warning(`${key} is not set`);
      }
    } else if (key === 'model') {
      logger.info(`Model: ${config.model}`);
    } else {
      logger.error(`Unknown config key: ${key}`);
    }
    return;
  }
  
  if (action === 'show') {
    const config = loadConfig();
    
    logger.header('Configuration Settings');
    logger.info(`Active Provider: ${config.provider}`);
    logger.info(`Default Model: ${config.model}`);
    
    // Show masked keys for all providers
    const providers: ('gemini' | 'openrouter' | 'groq')[] = ['gemini', 'openrouter', 'groq'];
    for (const p of providers) {
      const pKey = getProviderApiKey(p);
      const isCurrent = p === config.provider ? chalk.green(' (active)') : '';
      if (pKey) {
        const masked = pKey.slice(0, 8) + '...' + pKey.slice(-4);
        logger.info(`  ${p} API Key:${isCurrent} ${masked}`);
      } else {
        logger.warning(`  ${p} API Key:${isCurrent} Not set`);
      }
    }
    
    logger.blank();
    logger.info(`Default Categories: ${config.defaultCategories.join(', ')}`);
    return;
  }
  
  // Interactive config setup
  logger.header('Configuration Setup');
  
  const config = loadConfig();
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select AI Provider:',
      choices: [
        { name: 'Google Gemini (default)', value: 'gemini' },
        { name: 'OpenRouter', value: 'openrouter' },
        { name: 'Groq', value: 'groq' }
      ],
      default: config.provider
    },
    {
      type: 'input',
      name: 'model',
      message: 'Default model name:',
      default: (answers: any) => {
        if (answers.provider === 'gemini') return 'gemini-1.5-flash';
        if (answers.provider === 'openrouter') return 'google/gemini-2.5-flash';
        if (answers.provider === 'groq') return 'llama-3.3-70b-versatile';
        return config.model;
      }
    }
  ]);
  
  // Fetch key for selected provider
  const currentKey = getProviderApiKey(answers.provider);
  const keyAnswer = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `API Key for ${answers.provider.toUpperCase()}:`,
      default: currentKey ? '(keep existing)' : undefined,
      mask: '*'
    }
  ]);
  
  // Save selections
  const keyName = `${answers.provider}ApiKey` as 'geminiApiKey' | 'openRouterApiKey' | 'groqApiKey';
  const newConfig: Partial<typeof config> = {
    provider: answers.provider,
    model: answers.model
  };
  
  if (keyAnswer.apiKey && keyAnswer.apiKey !== '(keep existing)') {
    newConfig[keyName] = keyAnswer.apiKey;
    if (answers.provider === 'gemini') {
      newConfig.apiKey = keyAnswer.apiKey;
    }
  }
  
  saveConfig(newConfig);
  logger.success('Configuration saved successfully');
}
