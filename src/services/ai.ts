import fs from 'fs';
import path from 'path';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { FileInfo, CategoryResult, EXTENSION_MAP, DEFAULT_CATEGORIES } from '../types/index.js';
import { loadConfig, getProviderApiKey } from '../utils/config.js';

/**
 * Get active AI model based on provider and modelName
 */
function getAIModel(provider: string, modelName: string) {
  const apiKey = getProviderApiKey(provider as any);
  if (!apiKey) {
    throw new Error(
      `API Key for provider '${provider}' not found.\n` +
      `Configure it using: vync config set apiKey <your-key>\n` +
      `Or set the appropriate environment variable (e.g., ${provider.toUpperCase()}_API_KEY).`
    );
  }

  if (provider === 'gemini') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelName || 'gemini-1.5-flash');
  } else if (provider === 'openrouter') {
    const openRouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      headers: {
        'HTTP-Referer': 'https://github.com/vindiar/file-organizer',
        'X-Title': 'Vync File Organizer',
      }
    });
    return openRouter(modelName || 'google/gemini-2.5-flash');
  } else if (provider === 'groq') {
    const groq = createOpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey,
    });
    return groq(modelName || 'llama-3.3-70b-versatile');
  }
  
  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Extract 150 characters snippet from text files to assist categorization
 */
function getFileContentSnippet(filePath: string): string | undefined {
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.js', '.ts', '.py', '.html', '.css'];
  const ext = path.extname(filePath).toLowerCase();
  
  if (!textExtensions.includes(ext)) {
    return undefined;
  }
  
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(150);
    const bytesRead = fs.readSync(fd, buffer, 0, 150, 0);
    fs.closeSync(fd);
    
    if (bytesRead === 0) {
      return '';
    }
    
    return buffer.toString('utf8', 0, bytesRead).replace(/[\r\n\t]+/g, ' ').trim();
  } catch {
    return undefined;
  }
}

/**
 * Categorize files using AI
 */
export async function categorizeFiles(
  files: FileInfo[],
  options: { smartRename?: boolean; multimodal?: boolean } = {}
): Promise<CategoryResult[]> {
  const results: CategoryResult[] = [];
  const needsAI: FileInfo[] = [];
  
  for (const file of files) {
    // If not smartRenaming and extension is known, categorize locally (0 tokens)
    if (!options.smartRename) {
      const localCategory = EXTENSION_MAP[file.extension];
      
      if (localCategory) {
        results.push({
          file,
          category: localCategory,
          confidence: 1.0,
          reason: `Based on extension: ${file.extension}`
        });
        continue;
      }
    }
    
    needsAI.push(file);
  }
  
  if (needsAI.length > 0) {
    const aiResults = await categorizeWithAI(needsAI, options);
    results.push(...aiResults);
  }
  
  return results;
}

/**
 * Use AI to categorize files with unknown extensions or for smart renaming
 */
async function categorizeWithAI(
  files: FileInfo[],
  options: { smartRename?: boolean; multimodal?: boolean } = {}
): Promise<CategoryResult[]> {
  const config = loadConfig();
  const model = getAIModel(config.provider, config.model);
  const results: CategoryResult[] = [];
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const imageFiles: FileInfo[] = [];
  const textFiles: FileInfo[] = [];
  
  for (const f of files) {
    if (options.multimodal && imageExtensions.includes(f.extension)) {
      imageFiles.push(f);
    } else {
      textFiles.push(f);
    }
  }
  
  // Process text-based metadata in batches of 50 to optimize token usage
  const batchSize = 50;
  for (let i = 0; i < textFiles.length; i += batchSize) {
    const batch = textFiles.slice(i, i + batchSize);
    const batchResults = await processTextBatch(batch, model, options.smartRename);
    results.push(...batchResults);
  }
  
  // Process image files (multimodal) individually
  for (const file of imageFiles) {
    try {
      const result = await processImageMultimodal(file, model, options.smartRename);
      results.push(result);
    } catch (error) {
      // Fallback if multimodal fails or is not supported by provider
      results.push({
        file,
        category: EXTENSION_MAP[file.extension] || 'Others',
        confidence: 0.5,
        reason: `Multimodal failed, fallback: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  return results;
}

/**
 * Process a batch of files via text prompts
 */
async function processTextBatch(
  files: FileInfo[],
  model: any,
  smartRename?: boolean
): Promise<CategoryResult[]> {
  const fileData = files.map(f => ({
    name: f.name,
    extension: f.extension || 'none',
    size: f.size,
    snippet: getFileContentSnippet(f.path)
  }));
  
  const prompt = `You are an expert file organizer. Classify these files into one of the categories: ${DEFAULT_CATEGORIES.join(', ')}.
${smartRename ? 'For each file, suggest a clean, descriptive, lowercase filename using kebab-case (e.g. invoice-may-2026.pdf) and assign it to the "suggestedName" field. Keep the same file extension!' : ''}

Files to classify:
${JSON.stringify(fileData, null, 2)}

Respond with a JSON array in the exact format (do not wrap in markdown blocks, do not explain):
[
  {
    "name": "filename.ext",
    "category": "CategoryName",
    "confidence": 0.95,
    "reason": "Brief explanation",
    "suggestedName": "new-filename.ext"
  }
]`;

  try {
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 3000
    });
    
    const parsed = parseAIResponse(text);
    
    return files.map(file => {
      const match = Array.isArray(parsed) ? parsed.find((p: any) => p.name === file.name) : null;
      if (match) {
        return {
          file,
          category: match.category || 'Others',
          confidence: match.confidence || 0.8,
          reason: match.reason || 'AI classified',
          newName: smartRename ? match.suggestedName || file.name : undefined
        };
      }
      return {
        file,
        category: EXTENSION_MAP[file.extension] || 'Others',
        confidence: 0.5,
        reason: 'Failed to classify'
      };
    });
  } catch (error) {
    // Fallback locally
    return files.map(file => ({
      file,
      category: EXTENSION_MAP[file.extension] || 'Others',
      confidence: 0.3,
      reason: 'AI classification failed, local fallback'
    }));
  }
}

/**
 * Process a single image file via multimodal content analysis
 */
async function processImageMultimodal(
  file: FileInfo,
  model: any,
  smartRename?: boolean
): Promise<CategoryResult> {
  const fileData = fs.readFileSync(file.path);
  const base64Image = fileData.toString('base64');
  const mimeType = getMimeType(file.extension);
  
  const prompt = `Analyze this image content. Categorize it into one of these: ${DEFAULT_CATEGORIES.join(', ')}.
${smartRename ? 'Suggest a clean, descriptive, lowercase kebab-case filename (suggestedName) based on its visual content (e.g. cat-playing-garden.jpg). Keep the extension!' : ''}

File details:
- Name: ${file.name}
- Size: ${file.size} bytes

Respond with a JSON object in the exact format (do not wrap in markdown blocks, do not explain):
{
  "category": "CategoryName",
  "confidence": 0.95,
  "reason": "Brief visual explanation",
  "suggestedName": "new-filename.ext"
}`;

  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', image: base64Image, mimeType }
        ]
      }
    ],
    maxTokens: 500
  });
  
  const parsed = parseAIResponse(text);
  
  return {
    file,
    category: parsed.category || 'Others',
    confidence: parsed.confidence || 0.8,
    reason: parsed.reason || 'Visual classification',
    newName: smartRename ? parsed.suggestedName || file.name : undefined
  };
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return map[ext] || 'image/jpeg';
}

function parseAIResponse(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
  }
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    throw new Error(`Failed to parse AI JSON response: ${cleanText}`);
  }
}

/**
 * Simple categorization without AI (based on extensions only)
 */
export function categorizeByExtension(files: FileInfo[]): CategoryResult[] {
  return files.map(file => {
    const category = EXTENSION_MAP[file.extension] || 'Others';
    return {
      file,
      category,
      confidence: category === 'Others' ? 0.5 : 1.0,
      reason: `Based on extension: ${file.extension || 'none'}`
    };
  });
}
