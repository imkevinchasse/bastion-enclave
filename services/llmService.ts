
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import { AuditResult, SecurityLevel, PhishingResult } from "../types";

// We use the Q4 quantized version of TinyLlama for browser efficiency
const MODEL_ID = "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC";

let engine: MLCEngine | null = null;

export const isModelReady = (): boolean => {
    return engine !== null;
};

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

/**
 * DEEP CREDENTIAL AUDIT
 * Analyzes password in the context of the service and username.
 */
export const runCredentialAudit = async (password: string, service?: string, username?: string): Promise<AuditResult> => {
  if (!engine) {
    throw new Error("Engine not initialized");
  }

  const contextStr = (service || username) 
    ? `\nContext:\nService: ${service || 'Unknown'}\nUsername: ${username || 'Unknown'}`
    : '';

  const prompt = `Analyze security of this password.${contextStr}
Password: "${password}"

Check for:
1. Complexity (Length, charset)
2. Predictability (Common patterns)
3. Contextual weakness (Does password contain parts of Service or Username?)

Response format:
Score: [0-100]
Level: [CRITICAL/LOW/MEDIUM/HIGH]
Analysis: [Short summary, mention if context leaked]
Suggestions: [Tip 1, Tip 2]`;

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.1, // Near-zero temp for deterministic output
    });

    const content = response.choices[0].message.content || "";
    return parseAuditOutput(content);

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
 * PHISHING & SOCIAL ENGINEERING DETECTION
 * Analyzes text for manipulative patterns.
 */
export const runPhishingAnalysis = async (text: string): Promise<PhishingResult> => {
    if (!engine) throw new Error("Engine not initialized");

    // Capture explicit signals from footer (address, unsubscribe)
    const truncated = text.substring(0, 2000);

    const prompt = `Classify this email.

Input Text: "${truncated}"

Instructions:
1. Identify INTENT.
   - Selling a product, discount, course, or subscription? -> RISK: SAFE (Marketing)
   - Threatening arrest, account ban, seizure of funds, or demanding password? -> RISK: DANGEROUS (Phishing)

2. Analyze URGENCY type.
   - "Sale ends today" / "50% off now" -> SAFE.
   - "Verify account now" / "Your funds will be seized" -> DANGEROUS.

3. Output Format.
   Risk: [SAFE / SUSPICIOUS / DANGEROUS]
   Confidence: [0-100]
   Indicators: [List triggers]
   Analysis: [Reasoning]

Examples:
- "50% off Cambly subscription, ends tomorrow" -> Risk: SAFE
- "Customs seized your package, pay fee now" -> Risk: DANGEROUS`;

    try {
        const response = await engine.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200, // Short output
            temperature: 0.1,
        });

        const content = response.choices[0].message.content || "";
        return parsePhishingOutput(content);

    } catch (err) {
        return {
            riskLevel: 'SUSPICIOUS',
            confidence: 0,
            indicators: ["Engine Error"],
            analysis: "Could not complete analysis due to internal error."
        };
    }
};

/**
 * NOTE ASSISTANT
 * Performs operations on note content: Summarize, Fix Grammar, Extract Todos.
 */
export const runTextTransformation = async (text: string, mode: 'summarize' | 'grammar' | 'todo'): Promise<string> => {
    if (!engine) throw new Error("Neural Engine not active. Please initialize it in the Auditor tab first.");

    const truncated = text.substring(0, 2000); // Prevent context overflow
    
    let sysPrompt = "";
    if (mode === 'summarize') sysPrompt = "Summarize the following text in 3 concise bullet points. Preserve key details.";
    if (mode === 'grammar') sysPrompt = "Fix grammar, spelling, and punctuation in the following text. Do not change the meaning. Return ONLY the corrected text.";
    if (mode === 'todo') sysPrompt = "Extract a list of actionable tasks from the text. Format them as a Markdown checklist (e.g. - [ ] Task). If none, say 'No tasks found'.";

    try {
        const response = await engine.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful secure assistant." },
                { role: "user", content: `${sysPrompt}\n\nINPUT:\n${truncated}` }
            ],
            max_tokens: 500,
            temperature: 0.3,
        });

        return response.choices[0].message.content || "AI returned no output.";
    } catch (err: any) {
        throw new Error(err.message || "AI Transformation failed");
    }
};

/**
 * VAULT SMART SEARCH
 * Expands a search query into related terms (Synonyms/Categories).
 */
export const expandSearchQuery = async (query: string): Promise<string[]> => {
    if (!engine) return []; // Fail gracefully if not loaded

    try {
        const response = await engine.chat.completions.create({
            messages: [
                { role: "user", content: `List 5 common synonyms, related service names, or categories for "${query}". Return ONLY a comma-separated list. Example: "streaming, netflix, hulu, video, movies"` }
            ],
            max_tokens: 60,
            temperature: 0.5,
        });

        const raw = response.choices[0].message.content || "";
        // Clean up the output
        return raw.split(',')
            .map(s => s.trim().replace(/\./g, ''))
            .filter(s => s.length > 2);
    } catch (err) {
        return [];
    }
};

/**
 * Robustly parses model output for Credential Audit.
 */
function parseAuditOutput(text: string): AuditResult {
    // Regex scraping for Key: Value patterns
    const scoreMatch = text.match(/(?:score|rating)[\s:*=]+(\d+)/i);
    const levelMatch = text.match(/(?:level|risk|classification)[\s:*=]+(CRITICAL|HIGH|MEDIUM|LOW)/i);
    const analysisMatch = text.match(/(?:analysis|summary)[\s:*=]+([^\n]+)/i);
    
    const suggestions: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim().match(/^[-*•]\s+/)) {
            suggestions.push(line.replace(/^[-*•]\s+/, '').trim());
        }
    }

    let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    let level = levelMatch ? (levelMatch[1].toUpperCase() as SecurityLevel) : SecurityLevel.LOW;
    let analysis = analysisMatch ? analysisMatch[1].trim() : "Analysis completed.";

    // Fallbacks
    if (!levelMatch && score > 0) {
        if (score < 40) level = SecurityLevel.CRITICAL;
        else if (score < 70) level = SecurityLevel.LOW;
        else if (score < 90) level = SecurityLevel.MEDIUM;
        else level = SecurityLevel.HIGH;
    }

    if (!analysisMatch && text.length > 10) {
        analysis = text.replace(/\n/g, ' ').substring(0, 150) + "...";
    }

    if (suggestions.length === 0) {
        suggestions.push("Review password complexity.");
        if (text.toLowerCase().includes('weak')) suggestions.push("Password appears weak.");
    }

    return {
        score: Math.min(100, Math.max(0, score)),
        level,
        analysis,
        suggestions: suggestions.slice(0, 3)
    };
}

/**
 * Robustly parses model output for Phishing Analysis.
 */
function parsePhishingOutput(text: string): PhishingResult {
    const riskMatch = text.match(/(?:risk|threat)[\s:*=]+(SAFE|SUSPICIOUS|DANGEROUS)/i);
    const confMatch = text.match(/(?:confidence|prob)[\s:*=]+(\d+)/i);
    const analysisMatch = text.match(/(?:analysis|summary)[\s:*=]+([^\n]+)/i);
    
    const indicators: string[] = [];
    // Extract indicators from lines or comma lists
    if (text.includes("Indicators:")) {
        const indSection = text.split("Indicators:")[1].split("\n")[0];
        indSection.split(/,|;/).forEach(i => {
            const clean = i.replace(/[\[\]]/g, '').trim();
            if (clean) indicators.push(clean);
        });
    }

    let riskLevel: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' = 'SUSPICIOUS';
    
    if (riskMatch) {
        riskLevel = riskMatch[1].toUpperCase() as any;
    } else {
        // Keyword fallback if model format breaks
        const lower = text.toLowerCase();
        if (lower.includes('safe') || lower.includes('marketing')) riskLevel = 'SAFE';
        else if (lower.includes('dangerous') || lower.includes('phish') || lower.includes('scam')) riskLevel = 'DANGEROUS';
    }

    // Safety Override: If keywords imply marketing but model said Dangerous, check context
    if (riskLevel === 'DANGEROUS') {
        const lower = text.toLowerCase();
        if (lower.includes('marketing') && lower.includes('safe')) {
             // Model hallucinated danger but reasoning says marketing
             riskLevel = 'SAFE'; 
        }
    }

    return {
        riskLevel,
        confidence: confMatch ? parseInt(confMatch[1], 10) : 85,
        indicators: indicators.length > 0 ? indicators : ["Content Analysis"],
        analysis: analysisMatch ? analysisMatch[1].trim() : text.substring(0, 100) + "..."
    };
}
