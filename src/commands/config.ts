import inquirer from 'inquirer';
import { logger } from '../utils/logger.js';
import { loadConfig, saveConfig, setApiKey, getApiKey } from '../utils/config.js';

export async function configCommand(action?: string, key?: string, value?: string): Promise<void> {
  if (action === 'set' && key && value) {
    // Set a config value
    if (key === 'apiKey' || key === 'api-key') {
      setApiKey(value);
      logger.success('API key saved successfully');
    } else if (key === 'model') {
      saveConfig({ model: value });
      logger.success(`Model set to: ${value}`);
    } else {
      logger.error(`Unknown config key: ${key}`);
      logger.info('Available keys: apiKey, model');
    }
    return;
  }
  
  if (action === 'get' && key) {
    // Get a config value
    const config = loadConfig();
    
    if (key === 'apiKey' || key === 'api-key') {
      const apiKey = getApiKey();
      if (apiKey) {
        // Mask the key for security
        const masked = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
        logger.info(`API Key: ${masked}`);
      } else {
        logger.warning('API Key not set');
      }
    } else if (key === 'model') {
      logger.info(`Model: ${config.model}`);
    } else {
      logger.error(`Unknown config key: ${key}`);
    }
    return;
  }
  
  if (action === 'show') {
    // Show all config
    const config = loadConfig();
    const apiKey = getApiKey();
    
    logger.header('Configuration');
    
    if (apiKey) {
      const masked = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
      logger.info(`API Key: ${masked}`);
    } else {
      logger.warning('API Key: Not set');
    }
    
    logger.info(`Model: ${config.model}`);
    logger.info(`Categories: ${config.defaultCategories.join(', ')}`);
    return;
  }
  
  // Interactive mode
  logger.header('Configuration Setup');
  
  const currentApiKey = getApiKey();
  const config = loadConfig();
  
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'OpenCode Zen API Key:',
      default: currentApiKey ? '(keep existing)' : undefined,
      mask: '*'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Default model:',
      default: config.model
    }
  ]);
  
  if (answers.apiKey && answers.apiKey !== '(keep existing)') {
    setApiKey(answers.apiKey);
  }
  
  if (answers.model) {
    saveConfig({ model: answers.model });
  }
  
  logger.success('Configuration saved');
}
