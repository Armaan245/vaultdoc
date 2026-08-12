import { LLMProvider } from './base';

export interface CloudProviderOptions {
  apiKey: string;
  baseUrl?: string; // Optional, defaults to OpenAI if not provided
  embedModel?: string; // Default to text-embedding-3-small
  chatModel?: string; // Default to gpt-4o or similar
}

export class CloudProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private embedModel: string;
  private chatModel: string;

  constructor(options: CloudProviderOptions) {
    if (!options.apiKey) {
      throw new Error('API key is required for CloudProvider');
    }
    this.apiKey = options.apiKey;
    // Default to OpenAI's endpoint if no base URL provided
    this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.embedModel = options.embedModel || 'text-embedding-3-small';
    this.chatModel = options.chatModel || 'gpt-4o';
  }

  async embedText(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.embedModel,
        input: text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloud embedding failed: ${errorText}`);
    }

    const data = await res.json();
    return data.data[0].embedding;
  }

  async *streamDocumentation(prompt: string, contextChunks: string[]): AsyncGenerator<string> {
    const contextText = contextChunks.join('\n\n---\n\n');
    const systemPrompt = `You are an expert software documentation assistant. Use the following context to answer the user's task. Context:\n${contextText}`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloud generation failed: ${errorText}`);
    }

    if (!res.body) {
      throw new Error('No response body from Cloud provider');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue;
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              yield parsed.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }
  }
}
