export type AiGenerationRequest = {
  prompt: string;
  maxCharacters: number;
};

export type AiGenerationResult = {
  text: string;
  model: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export interface AiTextProvider {
  generateText(request: AiGenerationRequest): Promise<AiGenerationResult>;
}

export class StaticAiTextProvider implements AiTextProvider {
  constructor(private readonly result: AiGenerationResult | Error) {}

  async generateText(): Promise<AiGenerationResult> {
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}
