#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { AICodeReviewer } from './reviewer';
import { ReviewConfig } from './types';

const program = new Command();

program
  .name('ai-review')
  .description('AI-powered code reviewer using local LLM models')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    const configPath = path.join(process.cwd(), 'ai-review.json');
    
    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow('Configuration file already exists!'));
      return;
    }

    const defaultConfig: ReviewConfig = {
      model: 'codellama:7b',
      temperature: 0.1,
      maxTokens: 2000,
      includePatterns: ['**/*.{js,ts,jsx,tsx,py,java}'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*'],
      reviewTypes: ['security', 'performance', 'bugs', 'maintainability'],
      outputFormat: 'console',
      severity: 'medium'
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(chalk.green('✅ Configuration file created: ai-review.json'));
    console.log(chalk.dim('Edit the file to customize your review settings.'));
  });

program
  .command('review')
  .description('Review code in the current directory')
  .argument('[path]', 'Path to review', '.')
  .option('-c, --config <path>', 'Configuration file path', 'ai-review.json')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-o, --output <format>', 'Output format (console|json|markdown)')
  .option('-s, --severity <level>', 'Minimum severity level (low|medium|high|all)')
  .option('--save <path>', 'Save report to file')
  .action(async (targetPath: string, options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      // Load configuration
      const configPath = path.resolve(options.config);
      let config: ReviewConfig;
      
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } else {
        spinner.warn('No configuration file found. Using defaults.');
        config = {
          model: 'codellama:7b',
          temperature: 0.1,
          maxTokens: 2000,
          includePatterns: ['**/*.{js,ts,jsx,tsx,py,java}'],
          excludePatterns: ['**/node_modules/**', '**/dist/**'],
          reviewTypes: ['security', 'performance', 'bugs'],
          outputFormat: 'console',
          severity: 'medium'
        };
      }

      // Override with CLI options
      if (options.model) config.model = options.model;
      if (options.output) config.outputFormat = options.output;
      if (options.severity) config.severity = options.severity;

      spinner.text = 'Initializing AI reviewer...';
      
      // Create reviewer and run review
      const reviewer = new AICodeReviewer(config);
      
      spinner.text = 'Starting code review...';
      const result = await reviewer.review(path.resolve(targetPath));
      
      spinner.succeed('Code review completed!');
      
      // Generate and display report
      const report = await reviewer.generateReport(result);
      
      if (options.save) {
        fs.writeFileSync(options.save, report);
        console.log(chalk.green(`Report saved to: ${options.save}`));
      } else {
        console.log(report);
      }
      
    } catch (error) {
      spinner.fail(`Review failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('models')
  .description('List available models')
  .action(async () => {
    console.log(chalk.bold('🤖 Recommended Models for Code Review:\n'));
    
    const models = [
      {
        name: 'codellama:7b',
        description: 'Code Llama 7B - Fast, good for basic code review',
        size: '3.8GB'
      },
      {
        name: 'codellama:13b',
        description: 'Code Llama 13B - Better accuracy, slower',
        size: '7.3GB'
      },
      {
        name: 'deepseek-coder:6.7b',
        description: 'DeepSeek Coder - Excellent for code analysis',
        size: '3.8GB'
      },
      {
        name: 'starcoder:7b',
        description: 'StarCoder - Good for multiple languages',
        size: '4.1GB'
      }
    ];

    models.forEach(model => {
      console.log(chalk.cyan(`• ${model.name}`));
      console.log(`  ${model.description}`);
      console.log(chalk.dim(`  Size: ${model.size}\n`));
    });

    console.log(chalk.yellow('💡 To install a model: ollama pull <model-name>'));
    console.log(chalk.dim('Make sure Ollama is running: ollama serve'));
  });

program.parse();