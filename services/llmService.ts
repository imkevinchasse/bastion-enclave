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

  const prompt = `You are a security expert. Audit this password: "${password}".
  Respond ONLY with valid JSON in this format:
  {
    "score": <number 0-100>,
    "level": "<CRITICAL|LOW|MEDIUM|HIGH>",
    "suggestions": ["<string>", "<string>"],
    "analysis": "<short string>"
  }
  Do not explain. Just JSON.`;

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 256,
      temperature: 0.1, // Low temp for deterministic JSON
    });

    const content = response.choices[0].message.content || "{}";
    
    // Naive cleanup of code blocks if the LLM wraps it
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonStr) as AuditResult;
  } catch (err) {
    console.error("Local Audit Failed", err);
    // Fallback if model hallucinates non-JSON
    return {
      score: 0,
      level: SecurityLevel.LOW,
      suggestions: ["Model output error. Try again."],
      analysis: "The local AI failed to produce valid JSON."
    };
  }
};