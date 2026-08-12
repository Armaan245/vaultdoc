import * as lancedb from '@lancedb/lancedb';
import fs from 'fs';
import path from 'path';
import { LLMProvider } from '../providers/base';
import { ExtractedSymbol } from '../types';

export class GeneratorService {
  private dbPath: string;
  private provider: LLMProvider;

  constructor(provider: LLMProvider, dbPath = './.doc-cache/lancedb') {
    this.provider = provider;
    this.dbPath = dbPath;
  }

  async run(astFilePath: string, prompt: string, outputPath = 'ARCHITECTURE.md') {
    if (!fs.existsSync(astFilePath)) {
      throw new Error(`AST file not found at ${astFilePath}. Please run 'vaultdoc' first.`);
    }

    console.log(`Connecting to LanceDB at ${this.dbPath}...`);
    const db = await lancedb.connect(this.dbPath);

    const symbols: ExtractedSymbol[] = JSON.parse(fs.readFileSync(astFilePath, 'utf8'));
    console.log(`Loaded ${symbols.length} symbols from AST file.`);

    if (symbols.length === 0) {
      throw new Error('No symbols found to embed.');
    }

    // Embed all symbols
    console.log('Generating embeddings for symbols...');
    const dataToInsert = [];
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      // Create a rich text representation for the embedding
      const textToEmbed = `File: ${sym.filePath}\nSymbol: ${sym.symbol}\nType: ${sym.type}\nCode:\n${sym.code}`;
      const vector = await this.provider.embedText(textToEmbed);
      
      dataToInsert.push({
        id: `${sym.filePath}:${sym.symbol}:${sym.startLine}`,
        vector,
        code: sym.code,
        filePath: sym.filePath,
        symbol: sym.symbol,
        type: sym.type
      });

      if ((i + 1) % 10 === 0) {
        console.log(`Embedded ${i + 1}/${symbols.length} symbols...`);
      }
    }

    console.log('Storing vectors in LanceDB...');
    let table;
    const tableNames = await db.tableNames();
    if (tableNames.includes('code_chunks')) {
      table = await db.openTable('code_chunks');
      await table.add(dataToInsert);
    } else {
      table = await db.createTable('code_chunks', dataToInsert);
    }

    console.log('Embedding query prompt...');
    const queryVector = await this.provider.embedText(prompt);

    console.log('Searching for top 5 relevant code chunks...');
    const results = await table.search(queryVector).limit(5).toArray();

    const contextChunks = results.map((r: any) => 
      `File: ${r.filePath}\nSymbol: ${r.symbol} (${r.type})\nCode:\n${r.code}`
    );

    // Emit structured RAG chunks for the React UI to parse
    console.log(`\n__VAULTDOC_RAG_CHUNKS: ${JSON.stringify(results.map((r: any) => ({
      file: r.filePath,
      symbol: r.symbol,
      type: r.type,
      code: r.code,
      distance: r._distance || 0 // LanceDB includes _distance
    })))}\n`);

    console.log(`Generating documentation and streaming to ${outputPath}...`);
    
    // Ensure the output file exists or is cleared
    fs.writeFileSync(outputPath, '');
    const writeStream = fs.createWriteStream(outputPath, { flags: 'a' });

    const generator = this.provider.streamDocumentation(prompt, contextChunks);

    for await (const chunk of generator) {
      process.stdout.write(chunk);
      writeStream.write(chunk);
    }

    writeStream.end();
    console.log(`\n\nDocumentation successfully written to ${outputPath}`);
  }
}
