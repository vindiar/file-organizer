import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { FileInfo, CategoryResult, EXTENSION_MAP, DEFAULT_CATEGORIES } from '../types/index.js';
import { getApiKey } from '../utils/config.js';

/**
 * Categorize files using AI
 */
export async function categorizeFiles(files: FileInfo[]): Promise<CategoryResult[]> {
  const results: CategoryResult[] = [];
  
  // First, use extension mapping for common file types
  const needsAI: FileInfo[] = [];
  
  for (const file of files) {
    const extensionCategory = EXTENSION_MAP[file.extension];
    
    if (extensionCategory) {
      results.push({
        file,
        category: extensionCategory,
        confidence: 1.0,
        reason: `Based on extension: ${file.extension}`
      });
    } else {
      needsAI.push(file);
    }
  }
  
  // Use AI for unknown file types
  if (needsAI.length > 0) {
    const aiResults = await categorizeWithAI(needsAI);
    results.push(...aiResults);
  }
  
  return results;
}

/**
 * Use AI to categorize files with unknown extensions
 */
async function categorizeWithAI(files: FileInfo[]): Promise<CategoryResult[]> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error(
      'Gemini API key not found.\n' +
      'Set it using: file-organizer config set apiKey <your-key>\n' +
      'Or set GEMINI_API_KEY environment variable.\n' +
      'Get your free key at: https://aistudio.google.com/apikey'
    );
  }
  
  const fileList = files.map(f => ({
    name: f.name,
    extension: f.extension || 'none',
    size: f.size
  }));
  
  const prompt = `You are a file organization assistant. Categorize the following files into appropriate categories.

Available categories: ${DEFAULT_CATEGORIES.join(', ')}

Files to categorize:
${JSON.stringify(fileList, null, 2)}

Respond with a JSON array in this exact format (no markdown, no explanation):
[
  {"name": "filename.ext", "category": "CategoryName", "confidence": 0.9, "reason": "brief reason"}
]

Only respond with valid JSON array, nothing else.`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt,
      maxTokens: 2000
    });
    
    // Parse AI response - remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(cleanText);
    
    return files.map(file => {
      const match = parsed.find((p: { name: string }) => p.name === file.name);
      
      if (match) {
        return {
          file,
          category: match.category || 'Others',
          confidence: match.confidence || 0.5,
          reason: match.reason
        };
      }
      
      return {
        file,
        category: 'Others',
        confidence: 0.5,
        reason: 'Could not determine category'
      };
    });
  } catch (error) {
    // Fallback: put all unknown files in "Others"
    console.error('AI categorization failed:', error);
    
    return files.map(file => ({
      file,
      category: 'Others',
      confidence: 0.3,
      reason: 'AI categorization failed, using fallback'
    }));
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
