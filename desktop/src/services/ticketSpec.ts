import { lanceDb } from './vaultdoc';
import type { ASTSymbol, RAGChunk } from './vaultdoc';
import { getStoredProviderConfig } from './ai';

export interface ImpactedComponent {
  filePath: string;
  symbol: string;
  type: string;
  relevanceScore: number;
  reason: string;
}

export interface ClarificationQuestion {
  id: string;
  topic: string;
  question: string;
  impactLevel: 'High' | 'Medium' | 'Low';
  suggestedDefault: string;
}

export interface TicketSpecAnalysis {
  ticketTitle: string;
  summary: string;
  impactedComponents: ImpactedComponent[];
  clarificationQuestions: ClarificationQuestion[];
  generatedSpecMarkdown: string;
  matchingChunks: RAGChunk[];
}

/**
 * Analyzes Jira/Linear ticket text against active repository LanceDB index and AST symbols.
 */
export async function analyzeTicketSpec(
  ticketText: string,
  symbols: ASTSymbol[]
): Promise<TicketSpecAnalysis> {
  const lines = ticketText.split('\n').filter(Boolean);
  const firstLine = lines[0] || 'User Requirement Specification';
  const ticketTitle = firstLine.replace(/^(feat|fix|chore|refactor|task|\[.+?\])[:\s]+/i, '').trim();

  // 1. Search LanceDB for relevant AST chunks from active repository
  const matchingChunks = await lanceDb.search(ticketText, { symbols, limit: 6 });

  // Map matching chunks to impacted components
  const impactedComponents: ImpactedComponent[] = matchingChunks.map((c) => ({
    filePath: c.file,
    symbol: c.symbol,
    type: c.type,
    relevanceScore: Math.round((1 - c.distance) * 100),
    reason: `Direct AST node match for ticket keywords in ${c.symbol} (${c.type})`
  }));

  // If no chunks were returned from LanceDB, map top symbols from active repository
  if (impactedComponents.length === 0 && symbols.length > 0) {
    symbols.slice(0, 4).forEach((s, idx) => {
      impactedComponents.push({
        filePath: s.filePath,
        symbol: s.symbol,
        type: s.type,
        relevanceScore: 85 - idx * 5,
        reason: `Matched codebase AST module ${s.filePath}`
      });
    });
  }

  // 2. Formulate clarification questions based on requirements and AST context
  const textLower = ticketText.toLowerCase();
  const clarificationQuestions: ClarificationQuestion[] = [];

  if (textLower.includes('auth') || textLower.includes('permission') || textLower.includes('user') || textLower.includes('role') || textLower.includes('jwt')) {
    clarificationQuestions.push({
      id: 'cq-1',
      topic: 'Authentication & Access Control',
      question: 'Should unauthorized requests return HTTP 401 Unauthorized or HTTP 403 Forbidden, and are refresh tokens required?',
      impactLevel: 'High',
      suggestedDefault: 'Enforce strict 401 for unauthenticated and 403 for insufficient role permissions.'
    });
  }

  if (textLower.includes('delete') || textLower.includes('remove') || textLower.includes('cancel') || textLower.includes('drop')) {
    clarificationQuestions.push({
      id: 'cq-2',
      topic: 'Data Retention & Soft Deletes',
      question: 'Is this a permanent hard-delete or should we implement soft-deletion with an `archived_at` timestamp column?',
      impactLevel: 'High',
      suggestedDefault: 'Use soft deletion with 30-day retention.'
    });
  }

  if (textLower.includes('export') || textLower.includes('download') || textLower.includes('report') || textLower.includes('batch') || textLower.includes('sync')) {
    clarificationQuestions.push({
      id: 'cq-3',
      topic: 'Asynchronous Processing & Rate Limits',
      question: 'For heavy dataset jobs, should operations execute synchronously or queue a background worker task?',
      impactLevel: 'Medium',
      suggestedDefault: 'Process synchronously under 100 items, queue background task for larger batches.'
    });
  }

  if (textLower.includes('api') || textLower.includes('endpoint') || textLower.includes('route') || textLower.includes('rest') || textLower.includes('schema')) {
    clarificationQuestions.push({
      id: 'cq-4',
      topic: 'Schema Versioning & Backward Compatibility',
      question: 'Does this schema modification introduce breaking field deprecations for existing mobile/frontend consumers?',
      impactLevel: 'Medium',
      suggestedDefault: 'Maintain backward compatibility with optional legacy attributes.'
    });
  }

  if (clarificationQuestions.length < 3) {
    clarificationQuestions.push({
      id: 'cq-5',
      topic: 'Error Handling & Edge Cases',
      question: 'What specific HTTP error codes and fallback schemas should be returned when dependencies fail?',
      impactLevel: 'Low',
      suggestedDefault: 'Return structured JSON error payloads with diagnostic error codes.'
    });
  }

  // 3. Try to generate enhanced specification via local LLM if connected
  let generatedSpecMarkdown = '';
  try {
    const config = getStoredProviderConfig();
    const baseUrl = config.baseUrl.replace(/\/$/, '');

    let contextStr = 'Active Repository AST Symbols Context:\n';
    matchingChunks.forEach(c => {
      contextStr += `- File: ${c.file}, Symbol: ${c.symbol} (${c.type})\n\`\`\`\n${c.code.slice(0, 300)}\n\`\`\`\n`;
    });

    const prompt = `${contextStr}\nTicket Requirement:
${ticketText}

Generate a concise, professional technical implementation specification in Markdown with:
1. Executive Summary
2. Impacted Codebase Components (referencing actual files/symbols above)
3. Step-by-Step Implementation Strategy
4. Defensive Edge Cases & Acceptance Criteria`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey && config.apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    } else {
      headers['Authorization'] = 'Bearer local';
    }

    const isOpenAIFormat = config.provider === 'lmstudio' || config.provider === 'custom' || baseUrl.endsWith('/v1');
    const endpointUrl = isOpenAIFormat 
      ? (baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`)
      : `${baseUrl}/api/generate`;

    const requestBody = isOpenAIFormat
      ? JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'You are a senior software architect creating technical specifications for software engineering tickets.' },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      : JSON.stringify({
          model: config.model,
          prompt,
          stream: false
        });

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: requestBody
    });

    if (res.ok) {
      const data = await res.json();
      if (isOpenAIFormat && data.choices?.[0]?.message?.content) {
        generatedSpecMarkdown = data.choices[0].message.content;
      } else if (data.response) {
        generatedSpecMarkdown = data.response;
      }
    }
  } catch (e) {
    // Fallback to structured AST specification
  }

  if (!generatedSpecMarkdown) {
    generatedSpecMarkdown = `# Technical Specification: ${ticketTitle}

## 1. Executive Summary
**Objective**: Deliver functionality requested in ticket while maintaining strict zero-regression adherence against the active codebase.
**Ingested Context**: ${impactedComponents.length} codebase symbols matched via local LanceDB vector search.

## 2. Impacted Codebase Components
${impactedComponents.length > 0 ? impactedComponents.map(c => `- \`${c.symbol}\` in \`${c.filePath}\` (${c.type}) — *Relevance: ${c.relevanceScore}%*`).join('\n') : '- *No direct keyword matches found; will introduce new module into repository.*'}

## 3. Ambiguity & Clarification Checklist
${clarificationQuestions.map((q, idx) => `${idx + 1}. **${q.topic}**: ${q.question}\n   *Proposed Default*: ${q.suggestedDefault}`).join('\n\n')}

## 4. Implementation Steps & Acceptance Criteria
- [ ] Implement core logic in target AST modules with input validation and defensive checks.
- [ ] Verify 100% air-gapped local execution without external network telemetry.
- [ ] Add unit test coverage verifying happy path and edge cases.
- [ ] Run Shift-Left Pre-PR security audit before creating pull request.
`;
  }

  return {
    ticketTitle,
    summary: `Cross-referenced with ${impactedComponents.length} AST codebase components. Identified ${clarificationQuestions.length} technical ambiguities.`,
    impactedComponents,
    clarificationQuestions,
    generatedSpecMarkdown,
    matchingChunks
  };
}
