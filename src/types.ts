export interface ReviewConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  includePatterns: string[];
  excludePatterns: string[];
  reviewTypes: ReviewType[];
  outputFormat: 'json' | 'markdown' | 'console';
  severity: 'low' | 'medium' | 'high' | 'all';
}

export type ReviewType = 
  | 'security' 
  | 'performance' 
  | 'bugs' 
  | 'style' 
  | 'maintainability' 
  | 'complexity';

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface ReviewIssue {
  type: ReviewType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  code?: string;
}

export interface ReviewResult {
  summary: {
    totalFiles: number;
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
    issuesByType: Record<ReviewType, number>;
  };
  issues: ReviewIssue[];
  executionTime: number;
}

export interface LLMResponse {
  issues: ReviewIssue[];
  confidence: number;
}