import { LLMProvider } from './base';

export class OllamaProvider implements LLMProvider {
  private baseUrl = 'http://localhost:11434';
  private embedModel = 'nomic-embed-text';
  private chatModel = 'qwen2.5-coder:7b';

  async checkHealth(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.\nDetails: ${error.message}`);
    }
  }

  async embedText(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embedModel,
        prompt: text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama embedding failed: ${errorText}`);
    }

    const data = await res.json();
    return data.embedding;
  }

  async *streamDocumentation(prompt: string, contextChunks: string[]): AsyncGenerator<string> {
    const contextText = contextChunks.join('\n\n---\n\n');
    const fullPrompt = `Context:\n${contextText}\n\nTask:\n${prompt}`;

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.chatModel,
        prompt: fullPrompt,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama generation failed: ${errorText}`);
    }

    if (!res.body) {
      throw new Error('No response body from Ollama');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            yield parsed.response;
          }
        } catch (e) {
          // Ignore incomplete JSON chunks, wait for next buffer (naive split by newline usually works for Ollama streaming API since they yield 1 JSON object per line)
        }
      }
    }
  }
}
