import { ReviewConfig, ReviewResult, ReviewIssue } from './types';
import { LocalLLMClient } from './llm-client';
import { FileScanner } from './file-scanner';
import { OutputFormatter } from './output-formatter';

export class AICodeReviewer {
  private config: ReviewConfig;
  private llmClient: LocalLLMClient;
  private fileScanner: FileScanner;
  private formatter: OutputFormatter;

  constructor(config: ReviewConfig) {
    this.config = config;
    this.llmClient = new LocalLLMClient(config);
    this.fileScanner = new FileScanner(config);
    this.formatter = new OutputFormatter(config);
  }

  async review(targetPath: string): Promise<ReviewResult> {
    const startTime = Date.now();
    
    // Check if model is available
    if (!(await this.llmClient.isModelAvailable())) {
      console.log(`Model ${this.config.model} not found. Pulling...`);
      await this.llmClient.pullModel();
    }

    // Scan files
    console.log('Scanning files...');
    const files = await this.fileScanner.scanFiles(targetPath);
    console.log(`Found ${files.length} files to review`);

    // Review each file
    const allIssues: ReviewIssue[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Reviewing ${file.path} (${i + 1}/${files.length})`);
      
      try {
        const response = await this.llmClient.reviewCode(file);
        allIssues.push(...response.issues);
      } catch (error) {
        console.warn(`Failed to review ${file.path}: ${error}`);
      }
    }

    // Filter by severity
    const filteredIssues = this.filterBySeverity(allIssues);

    // Generate summary
    const summary = this.generateSummary(files, filteredIssues);
    
    const result: ReviewResult = {
      summary,
      issues: filteredIssues,
      executionTime: Date.now() - startTime,
    };

    return result;
  }

  private filterBySeverity(issues: ReviewIssue[]): ReviewIssue[] {
    if (this.config.severity === 'all') {
      return issues;
    }

    const severityOrder = { low: 1, medium: 2, high: 3 };
    const minSeverity = severityOrder[this.config.severity];

    return issues.filter(issue => 
      severityOrder[issue.severity] >= minSeverity
    );
  }

  private generateSummary(files: any[], issues: ReviewIssue[]) {
    const issuesBySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles: files.length,
      totalIssues: issues.length,
      issuesBySeverity,
      issuesByType,
    };
  }

  async generateReport(result: ReviewResult): Promise<string> {
    return this.formatter.format(result);
  }
}