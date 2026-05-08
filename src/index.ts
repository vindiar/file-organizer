#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import { organizeCommand } from './commands/organize.js';
import { configCommand } from './commands/config.js';

// Load environment variables
config();

const program = new Command();

// ASCII Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.magenta('🗂️  VYNC')} ${chalk.gray('- AI-Powered File Organizer')}                    ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Organize your files intelligently with Google Gemini AI')}   ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

program
  .name('vync')
  .description(`${chalk.bold('AI-powered file organizer CLI')}

${chalk.yellow('Description:')}
  Automatically organize your files (images, documents, videos, etc.)
  into categorized folders using Google Gemini AI.

${chalk.yellow('Quick Start:')}
  ${chalk.green('$')} vync config set apiKey ${chalk.gray('<your-gemini-api-key>')}
  ${chalk.green('$')} vync organize ${chalk.gray('<folder-path>')}

${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync organize "D:\\Downloads"              ${chalk.gray('# Organize downloads folder')}
  ${chalk.green('$')} vync organize . --dry-run                  ${chalk.gray('# Preview changes')}
  ${chalk.green('$')} vync organize . -i -r                      ${chalk.gray('# Interactive + recursive')}
  ${chalk.green('$')} vync "D:\\Downloads"                        ${chalk.gray('# Shorthand syntax')}

${chalk.yellow('Get Gemini API Key (FREE):')}
  ${chalk.blue.underline('https://aistudio.google.com/apikey')}`)
  .version('1.0.0', '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('beforeAll', banner)
  .showHelpAfterError('(use "vync --help" for usage information)');

// Organize command
program
  .command('organize')
  .description(`Organize files in a folder using AI categorization

${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync organize "D:\\Downloads"
  ${chalk.green('$')} vync organize . --dry-run
  ${chalk.green('$')} vync organize . --output "D:\\Organized" --recursive
  ${chalk.green('$')} vync organize . --extensions jpg png gif`)
  .argument('<folder>', 'Target folder path to organize')
  .option('-o, --output <path>', 'Custom output directory (default: ./Organized)')
  .option('-d, --dry-run', 'Preview changes without moving any files')
  .option('-i, --interactive', 'Confirm before organizing each batch')
  .option('-r, --recursive', 'Include files from subdirectories')
  .option('-e, --extensions <ext...>', 'Filter by file extensions (e.g., jpg png pdf)')
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
  .description(`Manage Vync configuration

${chalk.yellow('Actions:')}
  ${chalk.cyan('show')}              Display all current settings
  ${chalk.cyan('set <key> <value>')} Set a configuration value
  ${chalk.cyan('get <key>')}         Get a specific configuration value
  ${chalk.gray('(no args)')}         Interactive configuration mode

${chalk.yellow('Config Keys:')}
  ${chalk.cyan('apiKey')}  Your Google Gemini API key
  ${chalk.cyan('model')}   AI model to use (default: gemini-1.5-flash)

${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync config show
  ${chalk.green('$')} vync config set apiKey YOUR_API_KEY
  ${chalk.green('$')} vync config get model`)
  .argument('[action]', 'Action to perform: set, get, or show')
  .argument('[key]', 'Configuration key: apiKey or model')
  .argument('[value]', 'Value to set (required for "set" action)')
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
