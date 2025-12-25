/**
 * AI Intent Parser & Adapters
 * Parse natural language into payment intents
 * 
 * @example
 * ```typescript
 * import { PaymentIntentParser, GeminiAdapter } from '@zendfi/sdk/helpers';
 * 
 * // Parse AI response
 * const intent = PaymentIntentParser.parse(aiResponse);
 * if (intent?.action === 'payment') {
 *   await zendfi.smartPayments.execute({
 *     amount_usd: intent.amount,
 *     description: intent.description,
 *   });
 * }
 * 
 * // Or use adapters
 * const gemini = new GeminiAdapter(apiKey);
 * const { text, intent } = await gemini.chat('Buy coffee for $5');
 * ```
 */

export interface ParsedIntent {
  action: 'payment' | 'create_session' | 'check_balance' | 'check_status' | 'topup' | 'revoke' | 'enable_autonomy' | 'chat_only';
  amount?: number;
  description?: string;
  confidence: number; // 0-1
  rawText: string;
  metadata?: Record<string, any>;
}

export interface AICapabilities {
  createPayment?: boolean;
  createSessionKey?: boolean;
  checkBalance?: boolean;
  checkStatus?: boolean;
  topUpSession?: boolean;
  revokeSession?: boolean;
  enableAutonomy?: boolean;
}

/**
 * Payment Intent Parser
 * Extract payment information from natural language
 */
export class PaymentIntentParser {
  /**
   * Parse natural language into structured intent
   */
  static parse(text: string): ParsedIntent | null {
    if (!text || typeof text !== 'string') return null;

    const lowerText = text.toLowerCase().trim();

    // Try to extract action
    let action: ParsedIntent['action'] = 'chat_only';
    let confidence = 0;

    // Payment actions
    if (this.containsPaymentKeywords(lowerText)) {
      action = 'payment';
      confidence = 0.7;

      // Try to extract amount
      const amount = this.extractAmount(lowerText);
      const description = this.extractDescription(lowerText);

      if (amount && description) {
        confidence = 0.9;
        return { action, amount, description, confidence, rawText: text };
      }

      if (amount) {
        confidence = 0.8;
        return { action, amount, confidence, rawText: text };
      }
    }

    // Session key creation
    if (this.containsSessionKeywords(lowerText)) {
      action = 'create_session';
      confidence = 0.8;
      const amount = this.extractAmount(lowerText); // Budget/limit
      return { action, amount, confidence, rawText: text, description: 'Session key budget' };
    }

    // Balance/status check
    if (this.containsStatusKeywords(lowerText)) {
      action = lowerText.includes('session') || lowerText.includes('key') 
        ? 'check_status' 
        : 'check_balance';
      confidence = 0.9;
      return { action, confidence, rawText: text };
    }

    // Top-up
    if (this.containsTopUpKeywords(lowerText)) {
      action = 'topup';
      confidence = 0.8;
      const amount = this.extractAmount(lowerText);
      return { action, amount, confidence, rawText: text };
    }

    // Revoke
    if (this.containsRevokeKeywords(lowerText)) {
      action = 'revoke';
      confidence = 0.9;
      return { action, confidence, rawText: text };
    }

    // Autonomy
    if (this.containsAutonomyKeywords(lowerText)) {
      action = 'enable_autonomy';
      confidence = 0.8;
      const amount = this.extractAmount(lowerText); // Delegate limit
      return { action, amount, confidence, rawText: text, description: 'Autonomous delegate limit' };
    }

    return null;
  }

  /**
   * Generate system prompt for AI models
   */
  static generateSystemPrompt(capabilities: AICapabilities = {}): string {
    const enabledFeatures = Object.entries({
      createPayment: capabilities.createPayment !== false,
      createSessionKey: capabilities.createSessionKey !== false,
      checkBalance: capabilities.checkBalance !== false,
      checkStatus: capabilities.checkStatus !== false,
      topUpSession: capabilities.topUpSession !== false,
      revokeSession: capabilities.revokeSession !== false,
      enableAutonomy: capabilities.enableAutonomy !== false,
    })
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);

    return `You are a ZendFi payment assistant. You can help users with crypto payments on Solana.

Available Actions:
${enabledFeatures.includes('createPayment') ? '- Make payments (e.g., "Buy coffee for $5", "Send $20 to merchant")' : ''}
${enabledFeatures.includes('createSessionKey') ? '- Create session keys (e.g., "Create a session key with $100 budget")' : ''}
${enabledFeatures.includes('checkBalance') ? '- Check balances (e.g., "What\'s my balance?", "How much do I have?")' : ''}
${enabledFeatures.includes('checkStatus') ? '- Check session status (e.g., "Session key status", "How much is left?")' : ''}
${enabledFeatures.includes('topUpSession') ? '- Top up session keys (e.g., "Add $50 to session key", "Top up with $100")' : ''}
${enabledFeatures.includes('revokeSession') ? '- Revoke session keys (e.g., "Revoke session key", "Cancel my session")' : ''}
${enabledFeatures.includes('enableAutonomy') ? '- Enable autonomous mode (e.g., "Enable auto-pay with $25 limit")' : ''}

Response Format:
Always respond with valid JSON:
{
  "action": "payment" | "create_session" | "check_balance" | "check_status" | "topup" | "revoke" | "enable_autonomy" | "chat_only",
  "amount_usd": <number if applicable>,
  "description": "<description>",
  "message": "<friendly response to user>"
}

Examples:
User: "Buy coffee for $5"
You: {"action": "payment", "amount_usd": 5, "description": "coffee", "message": "Sure! Processing your $5 coffee payment..."}

User: "Create a session key with $100"
You: {"action": "create_session", "amount_usd": 100, "message": "I'll create a session key with a $100 budget..."}

User: "What's my balance?"
You: {"action": "check_balance", "message": "Let me check your balance..."}

Be helpful, concise, and always respond in valid JSON format.`;
  }

  // ============================================
  // Keyword Detection
  // ============================================

  private static containsPaymentKeywords(text: string): boolean {
    const keywords = [
      'buy', 'purchase', 'pay', 'send', 'transfer', 'payment',
      'order', 'checkout', 'subscribe', 'donate', 'tip',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  private static containsSessionKeywords(text: string): boolean {
    const keywords = [
      'create session', 'new session', 'session key', 'setup session',
      'generate session', 'make session', 'start session',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  private static containsStatusKeywords(text: string): boolean {
    const keywords = [
      'status', 'balance', 'remaining', 'left', 'how much',
      'check', 'show', 'view', 'display',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  private static containsTopUpKeywords(text: string): boolean {
    const keywords = [
      'top up', 'topup', 'add funds', 'add money', 'fund',
      'increase', 'reload', 'refill',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  private static containsRevokeKeywords(text: string): boolean {
    const keywords = [
      'revoke', 'cancel', 'disable', 'remove', 'delete',
      'stop', 'end', 'terminate',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  private static containsAutonomyKeywords(text: string): boolean {
    const keywords = [
      'autonomous', 'auto', 'automatic', 'delegate', 'enable auto',
      'auto-sign', 'auto sign', 'auto-pay', 'auto pay',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  // ============================================
  // Amount Extraction
  // ============================================

  private static extractAmount(text: string): number | undefined {
    // Try $XX.XX format
    const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1]!);
    }

    // Try XX USD/USDC format
    const usdMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:usd|usdc|dollars?)/i);
    if (usdMatch) {
      return parseFloat(usdMatch[1]!);
    }

    // Try standalone number near payment keywords
    const numberMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1]!);
      // Sanity check: reasonable payment amount
      if (num > 0 && num < 100000) {
        return num;
      }
    }

    return undefined;
  }

  // ============================================
  // Description Extraction
  // ============================================

  private static extractDescription(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    // Common items
    const items: Record<string, string[]> = {
      'coffee': ['coffee', 'espresso', 'latte', 'cappuccino'],
      'food': ['food', 'meal', 'lunch', 'dinner', 'breakfast'],
      'drink': ['drink', 'beverage', 'soda', 'juice'],
      'book': ['book', 'ebook', 'magazine'],
      'subscription': ['subscription', 'membership', 'plan'],
      'tip': ['tip', 'gratuity'],
      'donation': ['donate', 'donation', 'contribute'],
      'game': ['game', 'gaming'],
      'music': ['music', 'song', 'album'],
      'video': ['video', 'movie', 'film'],
    };

    for (const [item, keywords] of Object.entries(items)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        return item;
      }
    }

    // Extract text between "for" and amount
    const forMatch = text.match(/for\s+(.+?)(?:\s+\$|\s+usd|$)/i);
    if (forMatch && forMatch[1]) {
      const desc = forMatch[1].trim();
      if (desc.length > 0 && desc.length < 50) {
        return desc;
      }
    }

    return undefined;
  }
}

// ============================================
// AI Provider Adapters
// ============================================

export interface AIResponse {
  text: string;
  intent: ParsedIntent | null;
  raw?: any;
}

/**
 * OpenAI GPT Adapter
 */
export class OpenAIAdapter {
  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o-mini',
    private capabilities?: AICapabilities
  ) {}

  async chat(message: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
    const systemPrompt = PaymentIntentParser.generateSystemPrompt(this.capabilities);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    // Try to parse as JSON
    let intent: ParsedIntent | null = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        intent = {
          action: parsed.action || 'chat_only',
          amount: parsed.amount_usd,
          description: parsed.description,
          confidence: 0.9,
          rawText: text,
          metadata: { message: parsed.message },
        };
      }
    } catch {
      // Fallback to heuristic parsing
      intent = PaymentIntentParser.parse(text);
    }

    return { text, intent, raw: data };
  }
}

/**
 * Anthropic Claude Adapter
 */
export class AnthropicAdapter {
  constructor(
    private apiKey: string,
    private model: string = 'claude-3-5-sonnet-20241022',
    private capabilities?: AICapabilities
  ) {}

  async chat(message: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
    const systemPrompt = PaymentIntentParser.generateSystemPrompt(this.capabilities);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        system: systemPrompt,
        messages: [
          ...conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: message },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || '';

    let intent: ParsedIntent | null = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        intent = {
          action: parsed.action || 'chat_only',
          amount: parsed.amount_usd,
          description: parsed.description,
          confidence: 0.9,
          rawText: text,
          metadata: { message: parsed.message },
        };
      }
    } catch {
      intent = PaymentIntentParser.parse(text);
    }

    return { text, intent, raw: data };
  }
}

/**
 * Google Gemini Adapter
 */
export class GeminiAdapter {
  constructor(
    private apiKey: string,
    private model: string = 'gemini-2.0-flash-exp',
    private capabilities?: AICapabilities
  ) {}

  async chat(message: string): Promise<AIResponse> {
    const systemPrompt = PaymentIntentParser.generateSystemPrompt(this.capabilities);
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let intent: ParsedIntent | null = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        intent = {
          action: parsed.action || 'chat_only',
          amount: parsed.amount_usd,
          description: parsed.description,
          confidence: 0.9,
          rawText: text,
          metadata: { message: parsed.message },
        };
      }
    } catch {
      intent = PaymentIntentParser.parse(text);
    }

    return { text, intent, raw: data };
  }
}
