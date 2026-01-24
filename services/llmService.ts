import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import { AuditResult, SecurityLevel } from "../types";

// We use the Q4 quantized version of TinyLlama for browser efficiency
const MODEL_ID = "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC";

let engine: MLCEngine | null = null;

export const initLLM = async (
  onProgress: (text: string) => void
): Promise<void> => {
  if (engine) return;

  // 1. Check for WebGPU support
  // Fix: Cast navigator to any to resolve missing 'gpu' property in standard types
  if (!(navigator as any).gpu) {
    throw new Error("WebGPU is not supported in this browser. Please use Chrome 113+, Edge, or enable WebGPU flags.");
  }

  try {
    engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        onProgress(report.text);
      },
    });
  } catch (err: any) {
    console.error("Failed to load TinyLlama", err);
    // Propagate a clean error message
    throw new Error(err.message || "Failed to initialize Neural Engine");
  }
};

export const runLocalAudit = async (password: string): Promise<AuditResult> => {
  if (!engine) {
    throw new Error("Engine not initialized");
  }

  // Simplified prompt. We ask for JSON, but we prepare for anything.
  const prompt = `Analyze security: "${password}".
Response format:
Score: [0-100]
Level: [CRITICAL/LOW/MEDIUM/HIGH]
Analysis: [Short summary]
Suggestions: [Tip 1, Tip 2]`;

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 256,
      temperature: 0.1, // Near-zero temp for deterministic output
    });

    const content = response.choices[0].message.content || "";
    return parseModelOutput(content);

  } catch (err) {
    console.error("Local Audit Failed", err);
    return {
      score: 0,
      level: SecurityLevel.LOW,
      suggestions: ["Neural engine output error.", "Try simplifying the password or retrying."],
      analysis: "The local AI failed to run the inference."
    };
  }
};

/**
 * Robustly parses model output, handling JSON, loose Key-Values, or garbage.
 */
function parseModelOutput(text: string): AuditResult {
    // 1. Strategy: Try strict JSON extraction first
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            const jsonStr = text.substring(start, end + 1);
            const raw = JSON.parse(jsonStr);
            return validateAndNormalize(raw);
        }
    } catch (e) {
        // Ignore JSON errors, fall through to regex
    }

    // 2. Strategy: Regex scraping for Key: Value patterns
    // Matches "Score: 85" or "score=85" or "**Score**: 85"
    const scoreMatch = text.match(/(?:score|rating)[\s:*=]+(\d+)/i);
    const levelMatch = text.match(/(?:level|risk|classification)[\s:*=]+(CRITICAL|HIGH|MEDIUM|LOW)/i);
    const analysisMatch = text.match(/(?:analysis|summary)[\s:*=]+([^\n]+)/i);
    
    // Suggestions are harder, usually a list. Look for lines starting with - or *
    const suggestions: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim().match(/^[-*•]\s+/)) {
            suggestions.push(line.replace(/^[-*•]\s+/, '').trim());
        }
    }

    // 3. Strategy: Keyword Scanning (Last Resort)
    let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    let level = levelMatch ? (levelMatch[1].toUpperCase() as SecurityLevel) : SecurityLevel.LOW;
    let analysis = analysisMatch ? analysisMatch[1].trim() : "Analysis completed.";

    // If we missed the level but have a score, infer it
    if (!levelMatch && score > 0) {
        if (score < 40) level = SecurityLevel.CRITICAL;
        else if (score < 70) level = SecurityLevel.LOW;
        else if (score < 90) level = SecurityLevel.MEDIUM;
        else level = SecurityLevel.HIGH;
    }

    // If we missed the score but have a level, infer it
    if (!scoreMatch && levelMatch) {
         if (level === 'CRITICAL') score = 20;
         if (level === 'LOW') score = 50;
         if (level === 'MEDIUM') score = 75;
         if (level === 'HIGH') score = 95;
    }

    // If text is just a sentence without structure, use it as analysis
    if (!analysisMatch && text.length > 10 && text.length < 200) {
        analysis = text.replace(/\n/g, ' ').substring(0, 100);
    }

    if (suggestions.length === 0) {
        suggestions.push("Review password complexity.");
        if (passwordHasIssues(text)) suggestions.push("Potential weakness detected.");
    }

    return {
        score: Math.min(100, Math.max(0, score)),
        level,
        analysis,
        suggestions: suggestions.slice(0, 3)
    };
}

function validateAndNormalize(raw: any): AuditResult {
    let safeLevel = SecurityLevel.LOW;
    if (raw.level && Object.values(SecurityLevel).includes(raw.level as SecurityLevel)) {
        safeLevel = raw.level as SecurityLevel;
    }

    return {
        score: typeof raw.score === 'number' ? raw.score : 0,
        level: safeLevel,
        suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String) : ["Review security."],
        analysis: typeof raw.analysis === 'string' ? raw.analysis : "Analysis complete."
    };
}

function passwordHasIssues(text: string): boolean {
    const weakKeywords = ['weak', 'short', 'common', 'guessable', 'simple', 'pattern'];
    return weakKeywords.some(w => text.toLowerCase().includes(w));
}
