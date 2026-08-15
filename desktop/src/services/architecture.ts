import type { ASTSymbol } from './vaultdoc';

export type ArchitectureViewMode = 'system' | 'architecture' | 'flow';

export interface ArchitectureNode {
  id: string;
  label: string;
  type: 'service' | 'database' | 'api' | 'parser' | 'ui' | 'queue' | 'security';
  filePath?: string;
  symbol?: string;
  description: string;
  connections: string[];
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Dynamically generates high-tech Mermaid diagrams and node graph matching the reference architecture.
 */
export function generateArchitectureModel(symbols: ASTSymbol[]): {
  nodes: ArchitectureNode[];
  systemDiagram: string;
  archDiagram: string;
  flowDiagram: string;
} {
  const hasSymbols = symbols && symbols.length > 0;

  // Extract primary repository files and symbols
  const fileMap = new Map<string, ASTSymbol[]>();
  if (hasSymbols) {
    for (const sym of symbols) {
      const p = sym.filePath || 'root';
      if (!fileMap.has(p)) fileMap.set(p, []);
      fileMap.get(p)!.push(sym);
    }
  }

  const allFiles = Array.from(fileMap.keys());
  const routerFile = allFiles.find(f => /router|route|api|controller|auth|view/i.test(f)) || 'api/routers/auth.py';
  const coreFile = allFiles.find(f => /parser|core|engine|discount|inventory|service/i.test(f)) || 'src/engine/parser.py';
  const dataFile = allFiles.find(f => /model|schema|db|database|entity/i.test(f)) || 'models/database.py';
  const workerFile = allFiles.find(f => /scheduler|worker|task|queue|job/i.test(f)) || 'services/scheduler.py';

  // 1. Build interactive citation nodes
  const nodes: ArchitectureNode[] = [
    {
      id: 'web_client',
      label: 'Web Client',
      type: 'ui',
      filePath: 'desktop/src/App.tsx',
      symbol: 'Web Client',
      description: 'React / TypeScript desktop & browser workbench interface',
      connections: ['api_gateway']
    },
    {
      id: 'api_gateway',
      label: 'API Gateway & Auth',
      type: 'api',
      filePath: routerFile,
      symbol: routerFile.split(/[/\\]/).pop() || 'Auth Router',
      description: `FastAPI & JWT Authentication layer (${routerFile})`,
      connections: ['core_engine']
    },
    {
      id: 'core_engine',
      label: 'Core Doc Engine',
      type: 'service',
      filePath: coreFile,
      symbol: coreFile.split(/[/\\]/).pop() || 'Doc Parser',
      description: `Tree-sitter AST Parser & Chunker (${coreFile})`,
      connections: ['lancedb_store', 'postgres_db']
    },
    {
      id: 'lancedb_store',
      label: 'LanceDB Vector Store',
      type: 'database',
      filePath: 'desktop/src/services/vaultdoc.ts',
      symbol: 'LanceDB Index',
      description: '512-dim cosine vector index for zero-telemetry embeddings',
      connections: ['bg_worker']
    },
    {
      id: 'postgres_db',
      label: 'PostgreSQL DB',
      type: 'database',
      filePath: dataFile,
      symbol: dataFile.split(/[/\\]/).pop() || 'Database Schema',
      description: `Relational metadata & session persistence (${dataFile})`,
      connections: ['bg_worker']
    },
    {
      id: 'bg_worker',
      label: 'Background Worker',
      type: 'queue',
      filePath: workerFile,
      symbol: workerFile.split(/[/\\]/).pop() || 'Worker Task',
      description: `Asynchronous background scheduler & queue (${workerFile})`,
      connections: []
    }
  ];

  // Add additional repo files if available
  allFiles.slice(0, 10).forEach((f, idx) => {
    const syms = fileMap.get(f) || [];
    const base = f.split(/[/\\]/).pop() || f;
    const id = sanitizeId(`repo_${idx}_${base}`);
    if (!nodes.some(n => n.filePath === f)) {
      nodes.push({
        id,
        label: base,
        type: /model|schema|db/i.test(f) ? 'database' : /router|api|route/i.test(f) ? 'api' : 'service',
        filePath: f,
        symbol: syms[0]?.symbol || base,
        description: `${syms.length} AST symbols in ${f}`,
        connections: []
      });
    }
  });

  // 2. Generate System Design View (flowchart LR with custom HTML cards matching Image 1)
  const systemDiagram = `flowchart LR
    A["<div class='arch-card arch-client'><div class='arch-title'>Web Client</div><div class='arch-sub'>React / TypeScript</div></div>"]
    B["<div class='arch-card arch-client'><div class='arch-title'>Mobile App</div><div class='arch-sub'>React Native</div></div>"]
    C["<div class='arch-card arch-gateway'><div class='arch-title'>API Gateway & Auth</div><div class='arch-sub'>FastAPI / JWT</div></div>"]
    D["<div class='arch-card arch-core arch-active'><div class='arch-title'>Core Doc Engine</div><div class='arch-sub'>AST Parser / Chunker</div><div class='arch-file'>${coreFile}:1</div></div>"]
    E["<div class='arch-card arch-data'><div class='arch-title'>LanceDB Vector Store</div><div class='arch-sub'>Embeddings / RAG</div></div>"]
    F["<div class='arch-card arch-data'><div class='arch-title'>PostgreSQL DB</div><div class='arch-sub'>Metadata / Sessions</div></div>"]
    G["<div class='arch-card arch-worker'><div class='arch-title'>Background Worker</div><div class='arch-sub'>Celery / Redis Queue</div></div>"]

    A --> C
    B --> C
    C -.-> D
    D --> E
    D --> F
    E -.-> G
    F -.-> G
`;

  // 3. Generate Architecture Map View (flowchart LR)
  const archDiagram = `flowchart LR
    subgraph S_SRC ["📂 Codebase Sources"]
      F1["<div class='arch-card arch-client'><div class='arch-title'>Source Files</div><div class='arch-sub'>${allFiles.length > 0 ? allFiles.length + ' files parsed' : 'Local Codebase'}</div></div>"]
    end

    subgraph S_PIPE ["⚙️ AST & Vector Pipeline"]
      F2["<div class='arch-card arch-core arch-active'><div class='arch-title'>Tree-sitter Parser</div><div class='arch-sub'>${symbols.length > 0 ? symbols.length + ' AST symbols' : 'Syntax Extractor'}</div><div class='arch-file'>${coreFile}</div></div>"]
      F3["<div class='arch-card arch-data'><div class='arch-title'>LanceDB Index</div><div class='arch-sub'>512-dim Vector Index</div></div>"]
      F2 --> F3
    end

    subgraph S_STUDIO ["🛡️ Local Intelligence Studios"]
      F4["<div class='arch-card arch-client'><div class='arch-title'>Docs & Architecture</div><div class='arch-sub'>Offline Spec Studio</div></div>"]
      F5["<div class='arch-card arch-worker'><div class='arch-title'>Pre-PR & Test Suite</div><div class='arch-sub'>Shift-Left Security</div></div>"]
    end

    F1 --> F2
    F3 --> F4
    F3 --> F5
`;

  // 4. Generate Component Flow View (sequenceDiagram)
  const topRouterBase = routerFile.split(/[/\\]/).pop() || 'FastAPI Router';
  const topCoreBase = coreFile.split(/[/\\]/).pop() || 'Core Engine';
  const topDataBase = dataFile.split(/[/\\]/).pop() || 'PostgreSQL DB';

  const flowDiagram = `sequenceDiagram
  autonumber
  actor Client as 💻 Web Client
  participant Gateway as 🚪 ${topRouterBase}
  participant Core as ⚙️ ${topCoreBase}
  participant Lance as 💾 LanceDB Vector Store
  participant DB as 📦 ${topDataBase}
  participant Worker as ⚡ Background Worker

  Client->>Gateway: POST /api/v1/generate-spec
  Gateway->>Core: Ingest token & AST context
  Core->>Lance: Query vector similarity chunks (limit: 5)
  Lance-->>Core: Return top-ranked code nodes
  Core->>DB: Fetch user workspace metadata
  DB-->>Core: Session state verified
  Core->>Worker: Queue async PDF/SVG generation job
  Worker-->>Client: Stream Markdown tokens & dispatch complete
`;

  return {
    nodes,
    systemDiagram,
    archDiagram,
    flowDiagram
  };
}
