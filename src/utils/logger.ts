import chalk from 'chalk';

// Helper to strip ANSI codes to get correct length of colored strings
function getCleanLength(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, '').length;
}

// Simple color gradient helper (magenta -> violet -> blue -> cyan)
export function gradientText(text: string): string {
  const gradient = [
    chalk.rgb(255, 0, 128),   // Hot Pink
    chalk.rgb(224, 0, 160),   // Violet
    chalk.rgb(192, 0, 192),   // Purple
    chalk.rgb(128, 0, 224),   // Indigo
    chalk.rgb(64, 0, 255),    // Deep Blue
    chalk.rgb(0, 128, 255),   // Bright Blue
    chalk.rgb(0, 224, 224)    // Cyan
  ];
  
  return text.split('').map((char, index) => {
    if (char === ' ') return char;
    const colorIdx = Math.min(
      Math.floor((index / text.length) * gradient.length),
      gradient.length - 1
    );
    return gradient[colorIdx](char);
  }).join('');
}

// Map categories to emojis for vibrant UI
export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Images': '📸',
    'Documents': '📄',
    'Videos': '🎬',
    'Music': '🎵',
    'Archives': '📦',
    'Code': '💻',
    'Spreadsheets': '📊',
    'Presentations': '✨',
    'PDFs': '📕',
    'Duplicates': '👥',
    'Others': '📁'
  };
  return map[category] || '📁';
}

export const logger = {
  info: (message: string) => {
    console.log(chalk.rgb(51, 153, 255)('ℹ'), chalk.white(message));
  },
  
  success: (message: string) => {
    console.log(chalk.rgb(0, 204, 102)('✓'), chalk.white(message));
  },
  
  warning: (message: string) => {
    console.log(chalk.rgb(255, 153, 51)('⚠'), chalk.yellow(message));
  },
  
  error: (message: string) => {
    console.log(chalk.rgb(255, 51, 51)('✗'), chalk.red.bold(message));
  },
  
  file: (from: string, to: string, category: string, newName?: string) => {
    const emoji = getCategoryEmoji(category);
    const renameText = newName ? chalk.yellow(` (renamed to: ${newName})`) : '';
    console.log(
      chalk.gray('  →'),
      chalk.white(from),
      chalk.gray('→'),
      chalk.cyan(`${emoji} [${category}]`),
      chalk.green(to) + renameText
    );
  },
  
  category: (name: string, count: number) => {
    const emoji = getCategoryEmoji(name);
    console.log(
      chalk.cyan(`  ${emoji} ${name}:`),
      chalk.white.bold(`${count} files`)
    );
  },
  
  header: (message: string) => {
    console.log();
    console.log(gradientText(`🗂️  ${message.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(55)));
  },
  
  divider: () => {
    console.log(chalk.gray('─'.repeat(55)));
  },
  
  blank: () => {
    console.log();
  },

  /**
   * Draw a beautiful premium Bento-style information panel
   */
  drawPanel: (title: string, lines: string[], borderColor = chalk.cyan) => {
    // Determine target width based on title and longest line content
    const titleLen = getCleanLength(title);
    const lineLengths = lines.map(line => getCleanLength(line));
    const contentWidth = Math.max(titleLen + 6, ...lineLengths);
    
    // Width with padding inside borders (2 spaces padding on left and right)
    const boxWidth = contentWidth + 4;
    const horizontal = '─'.repeat(boxWidth - 2);
    
    console.log(borderColor(`┌${horizontal}┐`));
    
    // Print Title row
    const titlePadding = ' '.repeat(boxWidth - 4 - titleLen);
    console.log(borderColor(`│ `) + chalk.bold.rgb(255, 128, 0)(title) + titlePadding + borderColor(` │`));
    
    console.log(borderColor(`├${horizontal}┤`));
    
    // Print Content rows
    for (const line of lines) {
      const lineLen = getCleanLength(line);
      const linePadding = ' '.repeat(boxWidth - 4 - lineLen);
      console.log(borderColor(`│ `) + line + linePadding + borderColor(` │`));
    }
    
    console.log(borderColor(`└${horizontal}┘`));
  }
};
