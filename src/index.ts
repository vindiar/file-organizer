#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { organizeCommand } from './commands/organize.js';
import { configCommand } from './commands/config.js';

// Load environment variables
config();

const program = new Command();

program
  .name('file-organizer')
  .description('AI-powered file organizer CLI - automatically organize folders using AI')
  .version('1.0.0');

// Organize command
program
  .command('organize')
  .description('Organize files in a folder using AI categorization')
  .argument('<folder>', 'Folder path to organize')
  .option('-o, --output <path>', 'Output directory for organized files')
  .option('-d, --dry-run', 'Preview changes without moving files', false)
  .option('-i, --interactive', 'Ask for confirmation before organizing', false)
  .option('-r, --recursive', 'Scan subdirectories recursively', false)
  .option('-e, --extensions <ext...>', 'Only process files with these extensions')
  .action(async (folder: string, options) => {
    await organizeCommand(folder, {
      output: options.output,
      dryRun: options.dryRun,
      interactive: options.interactive,
      recursive: options.recursive,
      extensions: options.extensions
    });
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: set, get, or show')
  .argument('[key]', 'Config key (apiKey, model)')
  .argument('[value]', 'Value to set')
  .action(async (action?: string, key?: string, value?: string) => {
    await configCommand(action, key, value);
  });

// Default action: show help or run organize if folder is provided
program
  .argument('[folder]', 'Folder path to organize (shorthand for "organize" command)')
  .option('-o, --output <path>', 'Output directory for organized files')
  .option('-d, --dry-run', 'Preview changes without moving files', false)
  .option('-i, --interactive', 'Ask for confirmation before organizing', false)
  .option('-r, --recursive', 'Scan subdirectories recursively', false)
  .action(async (folder?: string, options?: Record<string, unknown>) => {
    if (folder && !['organize', 'config'].includes(folder)) {
      await organizeCommand(folder, {
        output: options?.output as string,
        dryRun: options?.dryRun as boolean,
        interactive: options?.interactive as boolean,
        recursive: options?.recursive as boolean
      });
    }
  });

program.parse();
