export type SymbolType =
  | 'function'
  | 'class'
  | 'export'
  | 'interface'
  | 'type alias'
  | 'enum';

export interface ExtractedSymbol {
  symbol: string;
  type: SymbolType;
  code: string;
  filePath: string;
  startLine: number;
  endLine: number;
}
