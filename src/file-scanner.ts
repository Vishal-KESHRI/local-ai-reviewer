import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { CodeFile, ReviewConfig } from './types';

export class FileScanner {
  private config: ReviewConfig;

  constructor(config: ReviewConfig) {
    this.config = config;
  }

  async scanFiles(targetPath: string): Promise<CodeFile[]> {
    const files: CodeFile[] = [];
    
    // Build glob patterns
    const includePatterns = this.config.includePatterns.length > 0 
      ? this.config.includePatterns 
      : ['**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rs,php}'];

    for (const pattern of includePatterns) {
      const fullPattern = path.join(targetPath, pattern);
      const matchedFiles = await glob(fullPattern, {
        ignore: this.config.excludePatterns.concat([
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/coverage/**'
        ])
      });

      for (const filePath of matchedFiles) {
        try {
          const file = await this.processFile(filePath);
          if (file) {
            files.push(file);
          }
        } catch (error) {
          console.warn(`Failed to process file ${filePath}: ${error}`);
        }
      }
    }

    return files;
  }

  private async processFile(filePath: string): Promise<CodeFile | null> {
    const stats = fs.statSync(filePath);
    
    // Skip large files (>100KB)
    if (stats.size > 100 * 1024) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);

    return {
      path: filePath,
      content,
      language,
      size: stats.size,
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
    };

    return languageMap[ext] || 'text';
  }
}