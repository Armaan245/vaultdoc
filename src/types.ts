export type SymbolType =
  | 'function'
  | 'class'
  | 'export'
  | 'interface'
  | 'type alias'
  | 'enum'
  | 'schema'
  | 'metadata'
  | 'doc';

export interface ExtractedSymbol {
  symbol: string;
  type: SymbolType;
  code: string;
  filePath: string;
  startLine: number;
  endLine: number;
}
