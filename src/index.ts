#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { scanDirectory } from './scanner';
import { initParser, parseFile } from './parser';
import { ExtractedSymbol } from './types';
import { GeneratorService } from './services/generator';
import { OllamaProvider } from './providers/ollama';
import { CloudProvider } from './providers/cloud';

const program = new Command();

program
  .name('vaultdoc')
  .description('CLI tool to parse code and generate documentation via RAG')
  .version('1.0.0');

program
  .command('parse')
  .description('Parse code into structured AST symbols')
  .option('-o, --output <path>', 'Output file path', 'vaultdoc-ast.json')
  .argument('[dir]', 'Directory to scan', '.')
  .action(async (dir, options) => {
    try {
      const targetDir = path.resolve(process.cwd(), dir);
      const outputPath = path.resolve(process.cwd(), options.output);

      console.log(`Scanning directory: ${targetDir}`);
      
      const files = await scanDirectory(targetDir);
      console.log(`Found ${files.length} valid source code files.`);

      if (files.length === 0) {
        console.log('No files to parse. Exiting.');
        return;
      }

      console.log('Initializing parser...');
      await initParser();

      let allSymbols: ExtractedSymbol[] = [];

      console.log('Parsing files...');
      for (const file of files) {
        try {
          const symbols = parseFile(file.absolutePath, file.relativePath);
          allSymbols = allSymbols.concat(symbols);
        } catch (err) {
          console.error(`Failed to parse file ${file.relativePath}:`, err);
        }
      }

      console.log(`Extracted ${allSymbols.length} symbols.`);
      
      fs.writeFileSync(outputPath, JSON.stringify(allSymbols, null, 2), 'utf-8');
      console.log(`Results saved to ${outputPath}`);
      
    } catch (err) {
      console.error('An error occurred:', err);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate documentation using RAG pipeline')
  .option('--provider <type>', 'LLM provider (ollama or cloud)', 'ollama')
  .option('--api-key <key>', 'API Key for cloud provider')
  .option('--base-url <url>', 'Base URL for cloud provider')
  .option('-i, --input <path>', 'Input AST JSON file', 'vaultdoc-ast.json')
  .option('-o, --output <path>', 'Output markdown file', 'ARCHITECTURE.md')
  .argument('<prompt>', 'Documentation prompt (e.g. "Generate an architecture overview")')
  .action(async (prompt, options) => {
    try {
      let llmProvider;
      if (options.provider === 'ollama') {
        const ollama = new OllamaProvider();
        console.log('Checking Ollama health...');
        await ollama.checkHealth();
        llmProvider = ollama;
      } else if (options.provider === 'cloud') {
        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        const baseUrl = options.baseUrl || process.env.OPENAI_BASE_URL;
        
        if (!apiKey) {
          throw new Error('Cloud provider requires --api-key or OPENAI_API_KEY environment variable.');
        }

        llmProvider = new CloudProvider({
          apiKey,
          baseUrl
        });
      } else {
        throw new Error(`Unknown provider: ${options.provider}`);
      }

      const inputPath = path.resolve(process.cwd(), options.input);
      const outputPath = path.resolve(process.cwd(), options.output);

      const generator = new GeneratorService(llmProvider);
      await generator.run(inputPath, prompt, outputPath);

    } catch (err: any) {
      console.error('Generation error:', err.message || err);
      process.exit(1);
    }
  });

// If no command is specified, default to parse for backwards compatibility (optional)
// But best to parse args directly
program.parse(process.argv);
