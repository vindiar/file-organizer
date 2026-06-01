# 🗂️ Vync - Advanced AI File Organizer CLI

Automatically organize your files (images, documents, videos, etc.) into categorized folders using AI.

**Powered by Google Gemini, OpenRouter, or Groq (Extremely Flexible & Fast!)**

---

## Features

- 🤖 **Multi-Provider AI support** - Dynamically switch between **Google Gemini**, **OpenRouter**, or **Groq** APIs.
- 📁 **Smart Extension Detection** - Falls back to extension-based categorization locally to save AI tokens.
- ⏱️ **Token Optimization Strategy** - Employs request batching, text document snippet previews, and local deduplication to keep API token usage minimal.
- 🔄 **Undo Operations (`vync undo`)** - Keep your workspace safe. Easily revert the last organization run back to its original paths with a single command.
- 🏷️ **Smart AI-driven Renaming (`-s, --smart-rename`)** - Uses AI to suggest clean, descriptive, kebab-case filenames (e.g., `IMG_4820.jpg` -> `family-beach-vacation.jpg`).
- 👁️ **Multimodal Visual Analysis (`-m, --multimodal`)** - Send image visual contents (base64) to supported AI models for high-accuracy visual categorization.
- 👥 **Duplicate File Detection (`--detect-duplicates`)** - Local MD5 checksum hashing to detect identical files and group them into a `Duplicates/` folder.
- 📅 **Date-based Sorting (`--date-format <format>`)** - Sort organized categories into monthly or yearly subfolders (e.g. `Organized/Images/2026-05/`).
- 📊 **Interactive HTML Report (`--report`)** - Generates a premium visual HTML dashboard (`vync-report.html`) featuring SVG charts, file lists, search filters, and status highlights.
- 👀 **Dry Run Mode (`-d, --dry-run`)** - Preview categorization changes and smart renames in the console and the HTML report without moving files.
- 🔄 **Recursive Scanning (`-r, --recursive`)** - Scan subdirectories recursively.

---

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link globally to use 'vync' command
npm link
```

---

## Setup & Configuration

Configure Vync interactively:
```bash
vync config
```
This guide prompts you to select your active AI provider, type in the corresponding API key, and choose your default model.

### Manual Configuration

#### 1. Select Active Provider
Choose between `gemini`, `openrouter`, or `groq`:
```bash
vync config set provider groq
```

#### 2. Set API Key
Save your key in Vync's local config file (stored securely under `~/.file-organizer/config.json` with user-only `chmod 600` permissions):
```bash
vync config set apiKey your-api-key-here
```

Or set the environment variable in a `.env` file in your working folder:
```env
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key
```

#### 3. Set Custom Model (Optional)
```bash
vync config set model llama-3.3-70b-versatile
```

#### 4. Show Current Settings
```bash
vync config show
```

### Example: Configuring a Custom OpenRouter Model

If you want to use a specific model from OpenRouter (e.g. `nousresearch/hermes-3-llama-3.1-405b:free`), configure it using the CLI:

```bash
# 1. Switch the provider to OpenRouter
vync config set provider openrouter

# 2. Set your OpenRouter API Key
vync config set apiKey YOUR_OPENROUTER_API_KEY

# 3. Choose your target model
vync config set model nousresearch/hermes-3-llama-3.1-405b:free

# 4. Verify your active settings
vync config show
```

---

## Usage

### Organize Files

```bash
# Basic usage (categorize and move files into Organized/ directory)
vync organize "D:\Downloads"

# Preview organization and smart renames without moving files
vync organize "D:\Downloads" --dry-run --smart-rename

# Deduplicate files and generate HTML dashboard report
vync organize "D:\Downloads" --detect-duplicates --report

# Interactive mode (checklist selection before moving)
vync organize "D:\Downloads" --interactive

# Sort with monthly date subfolders and recursive scan
vync organize "D:\Downloads" --recursive --date-format YYYY-MM

# Filter files by extensions
vync organize "D:\Downloads" --extensions jpg png pdf
```

### Undo Last Action

If you made a mistake or want to restore files back to their original locations, simply run:
```bash
vync undo
```
*Note: Vync maintains a LIFO stack of the last 10 operations, allowing you to undo multiple steps sequentially.*

---

## Default Categories

Files are sorted into the following default categories:

| Category | Extensions |
|----------|------------|
| Images | jpg, png, gif, svg, webp, heic, psd... |
| Documents | doc, docx, txt, rtf, odt, md... |
| Videos | mp4, avi, mkv, mov, webm... |
| Music | mp3, wav, flac, aac, ogg... |
| Archives | zip, rar, 7z, tar, gz... |
| Code | js, ts, py, java, cpp, html, css, json, yaml... |
| Spreadsheets | xls, xlsx, csv, ods... |
| Presentations | ppt, pptx, odp, key... |
| PDFs | pdf |
| Duplicates | Identical files identified by MD5 checksum |
| Others | Everything else |

---

## License

MIT
