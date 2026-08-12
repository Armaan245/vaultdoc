export interface LLMProvider {
  /**
   * Embeds the given text into a dense vector.
   * @param text The text to embed.
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Streams documentation markdown based on a prompt and retrieved context chunks.
   * @param prompt The system or user prompt.
   * @param contextChunks Relevant code chunks retrieved from vector search.
   */
  streamDocumentation(prompt: string, contextChunks: string[]): AsyncGenerator<string>;
}
