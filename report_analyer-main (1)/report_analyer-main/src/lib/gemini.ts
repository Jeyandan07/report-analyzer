
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyBaL5RZaKKysRcsiu9j0FR2ohsVRCWR-Kc'; // Fallback for safety/testing
const MODEL = "gemini-2.0-flash";

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export async function chatWithGemini(history: { role: 'user' | 'ai', content: string }[], newMessage: string, context?: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    // Sanitize and format history for Gemini
    // 1. Map to Gemini format
    let formattedHistory: ChatMessage[] = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
    }));

    // 2. Ensure it starts with 'user'. If first is model, prepend a context message.
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.unshift({ role: 'user', parts: [{ text: "Context: Previous analysis results." }] });
    }

    // 3. Compact consecutive same-role messages (Gemini requires strict alternation User -> Model -> User)
    const compactedHistory: ChatMessage[] = [];
    formattedHistory.forEach((msg, i) => {
        if (i === 0) {
            compactedHistory.push(msg);
        } else {
            const last = compactedHistory[compactedHistory.length - 1];
            if (last.role === msg.role) {
                // Merge parts
                last.parts[0].text += `\n\n${msg.parts[0].text}`;
            } else {
                compactedHistory.push(msg);
            }
        }
    });

    const contents = compactedHistory;


    // Add Context if provided (as a System instruction or just prepend to last message)
    let prompt = newMessage;
    if (context) {
        prompt = `Context: ${context}\n\nUser Question: ${newMessage}`;
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Gemini API Error details:", err);

            if (response.status === 400 && err.includes('API key not valid')) {
                throw new Error("Invalid API Key. Please check your configuration.");
            }
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
        console.error("Gemini Error:", error);
        if (error.message.includes("Invalid API Key")) {
            return "Connection failed: The provided AI Key appears to be invalid or expired. Please update it.";
        }
        return "I'm having trouble connecting to my brain right now. Please try again.";
    }
}

export async function detectAnomaliesWithGemini(csvData: any[], columns: string[]) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    // Limit data sent to avoid token limits/costs
    const sampleSize = 50;
    const sample = csvData.slice(0, sampleSize);
    const prompt = `
    Analyze the following CSV data sample (first ${sampleSize} rows) for anomalies, data quality issues, or interesting patterns.
    Return a concise summary of 3-5 key findings inside a JSON object with this structure:
    {
        "findings": [
            { "type": "anomaly" | "quality" | "pattern", "description": "...", "severity": "high" | "medium" | "low" }
        ]
    }
    
    Columns: ${columns.join(', ')}
    Data: ${JSON.stringify(sample)}
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("API Failed");

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;

        // Extract JSON from response (handling potential markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { findings: [] };
    } catch (error: any) {
        console.error("Gemini Anomaly Error:", error);
        if (error.message.includes("API Failed") || error.message.includes("Invalid API Key")) {
            return "Connection failed: The provided AI Key appears to be invalid or expired.";
        }
        return { findings: [] };
    }
}
