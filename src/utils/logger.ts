import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },
  
  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },
  
  warning: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },
  
  error: (message: string) => {
    console.log(chalk.red('✗'), message);
  },
  
  file: (from: string, to: string, category: string) => {
    console.log(
      chalk.gray('  →'),
      chalk.white(from),
      chalk.gray('→'),
      chalk.cyan(`[${category}]`),
      chalk.green(to)
    );
  },
  
  category: (name: string, count: number) => {
    console.log(
      chalk.cyan(`  📁 ${name}:`),
      chalk.white(`${count} files`)
    );
  },
  
  header: (message: string) => {
    console.log();
    console.log(chalk.bold.magenta('🗂️  ' + message));
    console.log(chalk.gray('─'.repeat(50)));
  },
  
  divider: () => {
    console.log(chalk.gray('─'.repeat(50)));
  },
  
  blank: () => {
    console.log();
  }
};
