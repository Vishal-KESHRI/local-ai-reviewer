import { ReviewConfig, ReviewResult, ReviewIssue } from './types';
import chalk from 'chalk';

export class OutputFormatter {
  private config: ReviewConfig;

  constructor(config: ReviewConfig) {
    this.config = config;
  }

  format(result: ReviewResult): string {
    switch (this.config.outputFormat) {
      case 'json':
        return this.formatJSON(result);
      case 'markdown':
        return this.formatMarkdown(result);
      case 'console':
      default:
        return this.formatConsole(result);
    }
  }

  private formatJSON(result: ReviewResult): string {
    return JSON.stringify(result, null, 2);
  }

  private formatMarkdown(result: ReviewResult): string {
    let output = '# AI Code Review Report\n\n';
    
    // Summary
    output += '## Summary\n\n';
    output += `- **Files Reviewed:** ${result.summary.totalFiles}\n`;
    output += `- **Total Issues:** ${result.summary.totalIssues}\n`;
    output += `- **Execution Time:** ${(result.executionTime / 1000).toFixed(2)}s\n\n`;

    // Issues by severity
    output += '### Issues by Severity\n\n';
    Object.entries(result.summary.issuesBySeverity).forEach(([severity, count]) => {
      const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
      output += `- ${emoji} **${severity.toUpperCase()}:** ${count}\n`;
    });
    output += '\n';

    // Issues by type
    output += '### Issues by Type\n\n';
    Object.entries(result.summary.issuesByType).forEach(([type, count]) => {
      output += `- **${type}:** ${count}\n`;
    });
    output += '\n';

    // Detailed issues
    if (result.issues.length > 0) {
      output += '## Issues\n\n';
      
      result.issues.forEach((issue, index) => {
        const severityEmoji = issue.severity === 'high' ? '🔴' : 
                             issue.severity === 'medium' ? '🟡' : '🟢';
        
        output += `### ${index + 1}. ${issue.title} ${severityEmoji}\n\n`;
        output += `**File:** \`${issue.file}\`\n`;
        if (issue.line) output += `**Line:** ${issue.line}\n`;
        output += `**Type:** ${issue.type}\n`;
        output += `**Severity:** ${issue.severity}\n\n`;
        output += `**Description:**\n${issue.description}\n\n`;
        
        if (issue.code) {
          output += `**Code:**\n\`\`\`\n${issue.code}\n\`\`\`\n\n`;
        }
        
        if (issue.suggestion) {
          output += `**Suggestion:**\n${issue.suggestion}\n\n`;
        }
        
        output += '---\n\n';
      });
    }

    return output;
  }

  private formatConsole(result: ReviewResult): string {
    let output = '';
    
    // Header
    output += chalk.bold.blue('\n🤖 AI Code Review Report\n');
    output += chalk.gray('='.repeat(50)) + '\n\n';

    // Summary
    output += chalk.bold('📊 Summary:\n');
    output += `  Files Reviewed: ${chalk.cyan(result.summary.totalFiles)}\n`;
    output += `  Total Issues: ${chalk.yellow(result.summary.totalIssues)}\n`;
    output += `  Execution Time: ${chalk.green((result.executionTime / 1000).toFixed(2))}s\n\n`;

    // Issues by severity
    if (Object.keys(result.summary.issuesBySeverity).length > 0) {
      output += chalk.bold('🎯 Issues by Severity:\n');
      Object.entries(result.summary.issuesBySeverity).forEach(([severity, count]) => {
        const color = severity === 'high' ? chalk.red : 
                     severity === 'medium' ? chalk.yellow : chalk.green;
        output += `  ${color(severity.toUpperCase())}: ${count}\n`;
      });
      output += '\n';
    }

    // Issues by type
    if (Object.keys(result.summary.issuesByType).length > 0) {
      output += chalk.bold('📋 Issues by Type:\n');
      Object.entries(result.summary.issuesByType).forEach(([type, count]) => {
        output += `  ${chalk.cyan(type)}: ${count}\n`;
      });
      output += '\n';
    }

    // Detailed issues
    if (result.issues.length > 0) {
      output += chalk.bold('🔍 Detailed Issues:\n');
      output += chalk.gray('-'.repeat(50)) + '\n\n';
      
      result.issues.forEach((issue, index) => {
        const severityColor = issue.severity === 'high' ? chalk.red : 
                             issue.severity === 'medium' ? chalk.yellow : chalk.green;
        
        output += chalk.bold(`${index + 1}. ${issue.title}\n`);
        output += `   File: ${chalk.cyan(issue.file)}`;
        if (issue.line) output += ` (Line ${issue.line})`;
        output += '\n';
        output += `   Type: ${chalk.magenta(issue.type)} | `;
        output += `Severity: ${severityColor(issue.severity)}\n\n`;
        
        output += `   ${chalk.dim('Description:')}\n`;
        output += `   ${issue.description}\n\n`;
        
        if (issue.suggestion) {
          output += `   ${chalk.dim('💡 Suggestion:')}\n`;
          output += `   ${chalk.green(issue.suggestion)}\n\n`;
        }
        
        output += chalk.gray('-'.repeat(50)) + '\n\n';
      });
    } else {
      output += chalk.green('✅ No issues found!\n\n');
    }

    return output;
  }
}