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

  // Highly structured prompt to constrain the small model (1.1B parameters)
  const prompt = `Analyze the security of this password: "${password}".
  
Return a raw JSON object (no markdown, no explanations) matching this schema:
{
  "score": number, // 0-100
  "level": "CRITICAL" | "LOW" | "MEDIUM" | "HIGH",
  "suggestions": string[], // Array of short security tips
  "analysis": string // Brief technical summary (max 15 words)
}

Example Output:
{
  "score": 12,
  "level": "CRITICAL",
  "suggestions": ["Too short", "Add symbols"],
  "analysis": "Insufficient entropy for brute-force resistance."
}`;

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.1, // Near-zero temp for deterministic output
      response_format: { type: "json_object" } // Enforce JSON mode
    });

    const content = response.choices[0].message.content || "{}";
    
    // Robust Extraction: TinyLlama might still wrap JSON in text or markdown
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    
    let jsonStr = "{}";
    if (start !== -1 && end !== -1 && end > start) {
        jsonStr = content.substring(start, end + 1);
    }
    
    const raw = JSON.parse(jsonStr);

    // Runtime type validation / normalization
    const safeScore = typeof raw.score === 'number' ? raw.score : 0;
    
    let safeLevel = SecurityLevel.LOW;
    if (Object.values(SecurityLevel).includes(raw.level as SecurityLevel)) {
        safeLevel = raw.level as SecurityLevel;
    }

    const safeSuggestions = Array.isArray(raw.suggestions) 
        ? raw.suggestions.map(String) 
        : ["Unable to generate specific suggestions."];

    const safeAnalysis = typeof raw.analysis === 'string' 
        ? raw.analysis 
        : "Automated analysis completed.";

    return {
        score: safeScore,
        level: safeLevel,
        suggestions: safeSuggestions,
        analysis: safeAnalysis
    };

  } catch (err) {
    console.error("Local Audit Failed", err);
    return {
      score: 0,
      level: SecurityLevel.LOW,
      suggestions: ["Neural engine output error.", "Try simplifying the password or retrying."],
      analysis: "The local AI failed to produce valid JSON structure."
    };
  }
};