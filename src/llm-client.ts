import { Ollama } from 'ollama';
import { ReviewConfig, CodeFile, LLMResponse, ReviewIssue } from './types';

export class LocalLLMClient {
  private ollama: Ollama;
  private config: ReviewConfig;

  constructor(config: ReviewConfig) {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
    this.config = config;
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      return models.models.some(m => m.name.includes(this.config.model));
    } catch {
      return false;
    }
  }

  async pullModel(): Promise<void> {
    await this.ollama.pull({ model: this.config.model });
  }

  async reviewCode(file: CodeFile): Promise<LLMResponse> {
    const prompt = this.buildPrompt(file);
    
    try {
      const response = await this.ollama.generate({
        model: this.config.model,
        prompt,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      return this.parseResponse(response.response, file);
    } catch (error) {
      throw new Error(`LLM request failed: ${error}`);
    }
  }

  private buildPrompt(file: CodeFile): string {
    const reviewTypes = this.config.reviewTypes.join(', ');
    
    return `You are an expert code reviewer. Analyze the following ${file.language} code for issues related to: ${reviewTypes}.

File: ${file.path}
Code:
\`\`\`${file.language}
${file.content}
\`\`\`

Please provide a JSON response with the following structure:
{
  "issues": [
    {
      "type": "security|performance|bugs|style|maintainability|complexity",
      "severity": "low|medium|high",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "line": 10,
      "column": 5,
      "suggestion": "How to fix this issue",
      "code": "problematic code snippet"
    }
  ],
  "confidence": 0.85
}

Focus on:
- Security vulnerabilities (SQL injection, XSS, etc.)
- Performance bottlenecks
- Potential bugs and logic errors
- Code style and best practices
- Maintainability issues
- Complexity problems

Only include issues with ${this.config.severity} severity or higher.
Provide specific line numbers when possible.
Give actionable suggestions for fixes.`;
  }

  private parseResponse(response: string, file: CodeFile): LLMResponse {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Add file path to each issue
      const issues: ReviewIssue[] = parsed.issues.map((issue: any) => ({
        ...issue,
        file: file.path,
      }));

      return {
        issues,
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      // Fallback: create a generic issue if parsing fails
      return {
        issues: [{
          type: 'bugs',
          severity: 'low',
          title: 'LLM Response Parse Error',
          description: 'Failed to parse AI response. Manual review recommended.',
          file: file.path,
          suggestion: 'Review this file manually',
        }],
        confidence: 0.1,
      };
    }
  }
}