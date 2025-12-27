/**
 * Production-Safe OpenAI Wrapper
 * Treats LLM output as untrusted input - validates BEFORE caching
 */

import { openaiClient } from './OpenAIClient.js';

class JSONParseError extends Error {
  constructor(message, rawResponse) {
    super(message);
    this.name = 'JSONParseError';
    this.rawResponse = rawResponse;
  }
}

class OpenAIValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'OpenAIValidationError';
    this.details = details;
  }
}

/**
 * Strip markdown JSON fences and whitespace
 */
function sanitizeJSONResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  // Remove markdown code fences
  let cleaned = rawText.trim();

  // Strip ```json and ``` fences
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Attempt to parse JSON with strict validation
 */
function strictJSONParse(text) {
  const sanitized = sanitizeJSONResponse(text);

  if (!sanitized) {
    throw new JSONParseError('Empty or invalid input', text);
  }

  try {
    const parsed = JSON.parse(sanitized);

    // Validate it's actually an object or array
    if (parsed === null || typeof parsed !== 'object') {
      throw new JSONParseError('Parsed value is not an object or array', text);
    }

    return parsed;
  } catch (error) {
    if (error instanceof JSONParseError) {
      throw error;
    }
    throw new JSONParseError(`JSON parse failed: ${error.message}`, text);
  }
}

/**
 * Build a repair prompt for malformed JSON
 */
function buildRepairPrompt(originalPrompt, brokenResponse) {
  return {
    system: 'You are a JSON formatter. Fix malformed JSON and return ONLY valid JSON. No explanations, no markdown, no code fences.',
    user: `The following response was expected to be valid JSON but failed to parse:

\`\`\`
${brokenResponse}
\`\`\`

Original request context: "${originalPrompt.user.substring(0, 200)}..."

Return ONLY the corrected JSON object. No text before or after.`
  };
}

/**
 * Production-safe OpenAI JSON completion
 * - Validates responses before caching
 * - Sanitizes markdown/fences
 * - Retries once with repair prompt
 * - Fails cleanly with typed errors
 */
export async function safeJSONCompletion(messages, options = {}) {
  const { maxRetries = 1, model = 'gpt-4o-mini', temperature = 0.3 } = options;

  let attempt = 0;
  let lastError = null;
  let rawResponse = null;

  while (attempt <= maxRetries) {
    try {
      // Get raw response from OpenAI
      const response = await openaiClient.chatCompletionJSON(messages, {
        model,
        temperature,
        maxTokens: options.maxTokens,
      });

      // Handle case where chatCompletionJSON already returns parsed JSON
      if (response && typeof response === 'object' && !response.content) {
        // Response is already parsed JSON - validate it
        if (response === null) {
          throw new JSONParseError('OpenAI returned null', 'null');
        }
        return response;
      }

      // Handle case where response has a content property (raw text)
      rawResponse = response?.content || response;

      if (!rawResponse) {
        throw new OpenAIValidationError('OpenAI returned empty response', { attempt, response });
      }

      // If rawResponse is already an object, return it
      if (typeof rawResponse === 'object') {
        return rawResponse;
      }

      // Parse and validate
      const parsed = strictJSONParse(rawResponse);

      // Success - return validated JSON
      return parsed;

    } catch (error) {
      lastError = error;
      attempt++;

      // If this was our last retry, throw
      if (attempt > maxRetries) {
        break;
      }

      // Only retry on JSON parse errors
      if (error instanceof JSONParseError && rawResponse) {
        console.warn(`[SafeOpenAI] JSON parse failed on attempt ${attempt}, retrying with repair prompt...`);

        // Build repair prompt
        const repairPrompt = buildRepairPrompt(
          { user: messages[messages.length - 1]?.content || '' },
          rawResponse
        );

        // Replace messages with repair prompt
        messages = [
          { role: 'system', content: repairPrompt.system },
          { role: 'user', content: repairPrompt.user },
        ];

        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  // All retries exhausted
  throw new OpenAIValidationError(
    `Failed to get valid JSON after ${attempt} attempts: ${lastError.message}`,
    {
      attempts: attempt,
      lastError: lastError.message,
      rawResponse,
    }
  );
}

/**
 * Deterministic cache key generator
 */
export function getCacheKey(prefix, ...parts) {
  return `${prefix}:${parts.map(p => String(p).toLowerCase().trim()).join(':')}`;
}

export { JSONParseError, OpenAIValidationError };
