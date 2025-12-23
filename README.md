# 🗂️ Vync - AI File Organizer CLI

Automatically organize your files (images, documents, videos, etc.) into categorized folders using AI.

**Powered by Google Gemini (FREE!)**

## Features

- 🤖 **AI-Powered Categorization** - Uses Google Gemini AI to intelligently categorize files
- 📁 **Smart Extension Detection** - Falls back to extension-based categorization when AI is unavailable
- 👀 **Dry Run Mode** - Preview changes before actually moving files
- 🔄 **Recursive Scanning** - Optionally scan subdirectories
- ⚙️ **Configurable** - Customize API keys and models

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm link
```

## Setup

1. Get your FREE Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

2. Set your API key:
```bash
# Option 1: Using the CLI (recommended)
vync config set apiKey your-api-key

# Option 2: Environment variable
set GEMINI_API_KEY=your-api-key

# Option 3: Create a .env file
echo GEMINI_API_KEY=your-api-key > .env
```

## Usage

### Organize Files

```bash
# Basic usage
vync organize "D:\Downloads"

# Preview changes without moving files
vync organize "D:\Downloads" --dry-run

# Interactive mode (confirm before organizing)
vync organize "D:\Downloads" --interactive

# Recursive scan
vync organize "D:\Downloads" --recursive

# Custom output directory
vync organize "D:\Downloads" --output "D:\Organized"

# Filter by extension
vync organize "D:\Downloads" --extensions jpg png gif
```

### Configuration

```bash
# Show current config
vync config show

# Set API key
vync config set apiKey your-api-key

# Get API key
vync config get apiKey
```

### Help

```bash
# Show all commands
vync --help

# Show organize options
vync organize --help
```

## Categories

Files are organized into the following categories:

| Category | Extensions |
|----------|------------|
| Images | jpg, png, gif, svg, webp, heic, psd... |
| Documents | doc, docx, txt, rtf, odt, md... |
| Videos | mp4, avi, mkv, mov, webm... |
| Music | mp3, wav, flac, aac, ogg... |
| Archives | zip, rar, 7z, tar, gz... |
| Code | js, ts, py, java, cpp, html, css... |
| Spreadsheets | xls, xlsx, csv, ods... |
| Presentations | ppt, pptx, odp, key... |
| PDFs | pdf |
| Others | Everything else |

## License

MIT
