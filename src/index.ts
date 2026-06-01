#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import { organizeCommand } from './commands/organize.js';
import { configCommand } from './commands/config.js';
import { undoCommand } from './commands/undo.js';
import { gradientText } from './utils/logger.js';

// Load environment variables
config();

const program = new Command();

// ASCII Banner with premium gradient text
const banner = `
${gradientText('╔═══════════════════════════════════════════════════════════╗')}
${gradientText('║')}  ${chalk.bold(gradientText('🗂️  VYNC'))} ${chalk.gray('- Advanced AI File Organizer')}                 ${gradientText('║')}
${gradientText('║')}  ${chalk.gray('Organize your files with Gemini, OpenRouter, or Groq')}       ${gradientText('║')}
${gradientText('╚═══════════════════════════════════════════════════════════╝')}
`;

program
  .name('vync')
  .description(`${chalk.bold('AI-powered file organizer CLI')}

${chalk.yellow('Description:')}
  Automatically organize your files (images, documents, videos, etc.)
  into categorized folders using Google Gemini, OpenRouter, or Groq APIs.

${chalk.yellow('Quick Start:')}
  ${chalk.green('$')} vync config                       ${chalk.gray('# Interactive configuration')}
  ${chalk.green('$')} vync organize ${chalk.gray('<folder-path>')}         ${chalk.gray('# Organize files')}
  ${chalk.green('$')} vync undo                         ${chalk.gray('# Undo the last operation')}

${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync organize "D:\\Downloads" -s -m      ${chalk.gray('# Smart rename + visual analysis')}
  ${chalk.green('$')} vync organize . --detect-duplicates --report ${chalk.gray('# Deduplicate and generate HTML dashboard')}
  ${chalk.green('$')} vync organize . --date-format YYYY-MM     ${chalk.gray('# Sort into monthly subfolders')}
  ${chalk.green('$')} vync . -d -s                              ${chalk.gray('# Shorthand preview with smart rename')}`)
  .version('1.1.0', '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('beforeAll', banner)
  .showHelpAfterError('(use "vync --help" for usage information)');

// Define options to share
const registerOptions = (cmd: Command, isShorthand: boolean) => {
  cmd
    .option('-o, --output <path>', 'Custom output directory (default: ./Organized)')
    .option('-d, --dry-run', 'Preview changes without moving any files', false)
    .option('-i, --interactive', 'Confirm and select files before organizing', false)
    .option('-r, --recursive', 'Include files from subdirectories', false)
    .option('-e, --extensions <ext...>', 'Filter by file extensions (e.g., jpg png pdf)')
    .option('-s, --smart-rename', 'Suggest clean and descriptive filenames using AI', false)
    .option('-m, --multimodal', 'Analyze visual content of image files (requires supported model)', false)
    .option('--detect-duplicates', 'Scan and isolate duplicate files using MD5 hashing', false)
    .option('--date-format <format>', 'Sort files into date-based subfolders (e.g. YYYY-MM, YYYY)')
    .option('--report', 'Generate an interactive HTML visual report dashboard', true);
};

// Register options at program level for shorthand usage
registerOptions(program, true);

// Organize command
program
  .command('organize')
  .description(`Organize files in a folder using AI categorization
  
${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync organize "D:\\Downloads" -s
  ${chalk.green('$')} vync organize . --detect-duplicates --report
  ${chalk.green('$')} vync organize . --date-format YYYY-MM --interactive`)
  .argument('<folder>', 'Target folder path to organize')
  .action(async (folder: string, options, command) => {
    // Merge options parsed at program level (parent) and command level with logical OR
    const globalOpts = command.parent ? command.parent.opts() : {};
    const mergedOpts = {
      output: options.output || globalOpts.output,
      dryRun: options.dryRun || globalOpts.dryRun,
      interactive: options.interactive || globalOpts.interactive,
      recursive: options.recursive || globalOpts.recursive,
      extensions: options.extensions || globalOpts.extensions,
      smartRename: options.smartRename || globalOpts.smartRename,
      multimodal: options.multimodal || globalOpts.multimodal,
      detectDuplicates: options.detectDuplicates || globalOpts.detectDuplicates,
      dateFormat: options.dateFormat || globalOpts.dateFormat,
      report: options.report !== false && globalOpts.report !== false
    };
    await organizeCommand(folder, mergedOpts);
  });

// Register options on organize command to support options placed after subcommand
const organizeCmd = program.commands.find(c => c.name() === 'organize');
if (organizeCmd) {
  registerOptions(organizeCmd, false);
}

// Undo command
program
  .command('undo')
  .description('Undo the last file organization operation, returning files to original locations')
  .action(async () => {
    await undoCommand();
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
  ${chalk.cyan('provider')}          AI provider to use (gemini, openrouter, groq)
  ${chalk.cyan('apiKey')}            API key for the active provider
  ${chalk.cyan('model')}             AI model to use (e.g. gemini-1.5-flash, llama-3.3-70b-versatile)

${chalk.yellow('Examples:')}
  ${chalk.green('$')} vync config show
  ${chalk.green('$')} vync config set provider groq
  ${chalk.green('$')} vync config set apiKey YOUR_API_KEY`)
  .argument('[action]', 'Action to perform: set, get, or show')
  .argument('[key]', 'Configuration key: provider, apiKey, model')
  .argument('[value]', 'Value to set (required for "set" action)')
  .action(async (action?: string, key?: string, value?: string) => {
    await configCommand(action, key, value);
  });

// Default action: shorthand to organize folder
program
  .argument('[folder]', 'Folder path to organize (shorthand for "organize" command)')
  .action(async (folder, options, command) => {
    if (folder && !['organize', 'config', 'undo'].includes(folder)) {
      const globalOpts = command.opts();
      await organizeCommand(folder, globalOpts);
    } else if (!folder) {
      program.help();
    }
  });

program.parse();
