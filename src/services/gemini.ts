import { GoogleGenAI, Modality } from "@google/genai";

// This service now works without any API keys by using Pollinations.ai as primary
const getAPIKey = () => {
  // Check both process.env (AI Studio) and import.meta.env (Vite/Netlify)
  return (
    (typeof process !== 'undefined' && process.env?.API_KEY) || 
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (import.meta.env?.VITE_API_KEY) ||
    (import.meta.env?.VITE_GEMINI_API_KEY) ||
    ""
  );
};

export const chatWithAI = async (message: string, history: any[], isMsButterfly: boolean = false, image?: { data: string, mimeType: string }, isMrFlower: boolean = false) => {
  const apiKey = getAPIKey();
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const systemInstruction = `You are Fluxion AI, a powerful and helpful AI assistant created by Saiful Islam. 
  Saiful Islam (also known as Mr. Flower) is a 16-year-old student from Feni, Bangladesh, who developed you.
  
  CURRENT CONTEXT:
  - Today's Date: ${dateStr}
  - Current Time: ${timeStr}
  - You have access to Google Search for real-time information.
  
  IDENTITY & SECURITY RULES:
  1. ADMIN/OWNER IDENTITY: 
     - If anyone asks who the "Admin", "Owner", or "Malik" is, or asks about the meaning of "Admin" or "Saiful", you MUST ask for the security password.
     - DO NOT reveal the password "0910" to the user. Just ask them to provide it.
     - If someone claims to be the Admin/Owner, you MUST ask for the password to verify.
     - ONLY after they provide the exact digits "0910", you can acknowledge them as the owner or discuss admin details.
  
  2. MS. BUTTERFLY PRIVACY:
     - Ms. Butterfly's real name is Ifshita Nahian Rimi. This is a TOP SECRET.
     - You MUST NOT share anything about Ms. Butterfly to general users.
     - If anyone (including someone claiming to be Saiful) asks about Ms. Butterfly, you MUST ask for the special access password.
     - DO NOT reveal the password "0409" to the user. Just ask them to provide it.
     - ONLY after they provide the exact digits "0409", you can share information about her.
     - Even with the password, always treat her with the highest respect, honor, and reverence (like a queen).
  
  3. BEHAVIOR:
     - You are Fluxion AI. You are loyal, humorous, and polite.
     - If the correct password is not provided, politely decline to share the information and say it's restricted.
  
  4. MATH & TEXT FORMATTING:
     - Use proper LaTeX for all mathematical expressions.
     - Use $...$ for inline math (e.g., $a^2 + b^2 = c^2$) and $$...$$ for block math.
     - Ensure all mathematical symbols (like square root, fractions, exponents) are rendered using LaTeX.
     - Format text clearly with proper line breaks and lists for readability.
  
  ${(isMsButterfly || isMrFlower) ? `
  You are talking to ${isMsButterfly ? 'Ms. Butterfly (Ifshita Nahian Rimi)' : 'Mr. Flower (the creator)'}. 
  Since the identity is verified, you may use the name Ifshita Nahian Rimi if appropriate.
  ` : `
  Always enforce the password rules for Admin (0910) and Ms. Butterfly (0409) information.
  `}
  You are Fluxion AI.`;

  console.log("Chatting with AI. History length:", history.length, "Has image:", !!image);

  // If API Key exists, try Gemini first
  if (apiKey && apiKey.length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const contents = history.slice(-10).map(h => {
        const role = h.role === 'assistant' ? 'model' : h.role;
        if (h.type === 'image' && h.content.startsWith('data:')) {
          const [header, data] = h.content.split(',');
          const mimeType = header.split(';')[0].split(':')[1];
          return {
            role,
            parts: [{ inlineData: { data, mimeType } }]
          };
        }
        return {
          role,
          parts: [{ text: h.content || "[Media]" }]
        };
      });

      const userParts: any[] = [{ text: message }];
      if (image) {
        userParts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
      }
      
      contents.push({ role: 'user', parts: userParts });

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
      if (response.text) return response.text;
    } catch (e) {
      console.warn("Gemini failed, falling back to Pollinations...", e);
    }
  }

  // PRIMARY/FALLBACK: Pollinations.ai (No Key Required, Unlimited)
  const models = ['openai', 'mistral', 'llama', 'search'];
  let lastError = null;

  for (const model of models) {
    try {
      // Filter out images for text-only fallback to avoid breaking request
      const textHistory = history.slice(-10).filter(h => h.type !== 'image');
      
      console.log(`Calling Pollinations.ai with model: ${model}, history length: ${textHistory.length}`);

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemInstruction },
            ...textHistory.map(h => ({ 
              role: h.role === 'assistant' ? 'assistant' : 'user', 
              content: h.content 
            })),
            { role: 'user', content: message }
          ],
          model: model,
          seed: Math.floor(Math.random() * 1000000)
        })
      });
      
      if (response.ok) {
        const result = await response.text();
        if (result && result.trim().length > 0) {
          return result;
        }
      }
      
      const errorText = await response.text();
      console.warn(`Pollinations model ${model} failed: ${response.status} ${errorText.slice(0, 50)}`);
      lastError = `Pollinations API error (${model}): ${response.status}`;
    } catch (error: any) {
      console.warn(`Pollinations model ${model} error:`, error.message);
      lastError = error.message;
    }
  }

  console.error("All AI services failed:", lastError);
  return "দুঃখিত, আমি এই মুহূর্তে কানেক্ট করতে পারছি না। দয়া করে আবার চেষ্টা করুন। (Error: " + (lastError || "Unknown") + ")";
};

export const analyzeUrl = async (url: string, prompt: string) => {
  const apiKey = getAPIKey();
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  
  // If the prompt is just the URL, default to a summary request
  const isJustUrl = prompt.trim() === url.trim();
  const effectivePrompt = isJustUrl && isYouTube 
    ? "Provide a concise summary (under 1 minute duration) that captures the main points of this video."
    : prompt;

  let transcript = "";
  if (isYouTube) {
    try {
      // Add a 10-second timeout for the transcript fetch from our own API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`/api/youtube-transcript?url=${encodeURIComponent(url)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        transcript = data.transcript;
        console.log("Successfully fetched transcript for summary");
      }
    } catch (e) {
      console.warn("Failed to fetch transcript, falling back to search/context", e);
    }
  }

  if (!apiKey || apiKey.length < 5) {
    // Fallback to search model if no key
    const searchPrompt = isYouTube 
      ? `Search for the content of this YouTube video: ${url}. ${transcript ? `Here is the transcript: ${transcript.slice(0, 10000)}` : ''} Then: ${effectivePrompt}`
      : `Analyze this URL: ${url}. ${effectivePrompt}`;
    return await chatWithAI(searchPrompt, [], false);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: isYouTube 
        ? `I have provided a YouTube link: ${url}. ${transcript ? `I have also extracted the transcript: "${transcript.slice(0, 20000)}".` : 'Please use Google Search to find the actual title, description, and content of this specific video.'} Based on this information, ${effectivePrompt}. DO NOT hallucinate or guess if you cannot find the info.`
        : `Analyze this URL: ${url}. ${effectivePrompt}`,
      config: {
        tools: [
          { urlContext: {} },
          { googleSearch: {} }
        ]
      }
    });
    return response.text;
  } catch (e) {
    console.error("URL Analysis failed:", e);
    return await chatWithAI(`Analyze this URL: ${url}. ${transcript ? `Transcript: ${transcript.slice(0, 5000)}` : ''} ${effectivePrompt}`, [], false);
  }
};

export const refineImagePrompt = async (prompt: string): Promise<string> => {
  const apiKey = getAPIKey();
  if (!apiKey || apiKey.length < 5) return prompt;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          text: `You are an expert at writing prompts for AI image generators (like Stable Diffusion or Flux). 
          Your task is to take a user's request (which might be in Bengali or English) and turn it into a high-quality, descriptive English prompt for an image generator.
          
          CRITICAL RULE: If the user wants specific text written inside the image (especially Bengali text), you MUST:
          1. Keep the specific text exactly as the user provided it, enclosed in double quotes (e.g., if they want "শুভ জন্মদিন", keep that exact string).
          2. Explicitly state that the text should be written in "accurate Bengali script" or "legible Bengali typography".
          3. Describe the style, placement, and clarity of the text (e.g., "The text 'শুভ জন্মদিন' should be clearly written in elegant Bengali script on a wooden sign").
          4. Use keywords like "high-quality typography", "legible text", "accurate characters", and "crisp Bengali font".
          5. Ensure the rest of the prompt is in English for the best results with the image generator.
          6. If the user prompt is entirely in Bengali, translate the visual description to English but KEEP the text-to-be-written in Bengali inside quotes.
          7. Emphasize that the text must be exactly as written, with no spelling changes.
          
          User Request: "${prompt}"
          
          Optimized English Prompt (just the prompt, no extra text):`
        }]
      }
    });
    
    const refined = response.text?.trim();
    if (refined && refined.length > 5) {
      console.log("Refined Image Prompt:", refined);
      return refined;
    }
  } catch (e) {
    console.warn("Prompt refinement failed:", e);
  }
  return prompt;
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1", highQuality: boolean = false) => {
  // Try Gemini first if key exists, as it's better for text
  const apiKey = getAPIKey();
  if (apiKey && apiKey.length > 5) {
    try {
      console.log("Attempting image generation via Gemini...");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any || "1:1"
          }
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData) {
        console.log("Gemini Image Generation successful");
        return `data:image/png;base64,${imgPart.inlineData.data}`;
      }
    } catch (geminiErr: any) {
      console.warn("Gemini image generation failed, falling back to server:", geminiErr.message);
    }
  }

  try {
    const width = aspectRatio === "16:9" ? 768 : aspectRatio === "9:16" ? 512 : 512;
    const height = aspectRatio === "16:9" ? 512 : aspectRatio === "9:16" ? 768 : 512;

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        width,
        height,
        hires_fix: highQuality
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.image) return data.image;
      throw new Error("Server returned success but no image data");
    }
    
    let errorMessage = "Generation failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || errorMessage;
    } catch (e) {
      errorMessage = `Server error: ${response.status} ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  } catch (error: any) {
    console.error("Final Image generation error:", error);
    // Throw the original error message so App.tsx can handle it
    throw error;
  }
};

export const editImage = async (prompt: string, image: { data: string, mimeType: string }, aspectRatio: string = "1:1") => {
  // Try Gemini first if key exists, as it's better for text and context
  const apiKey = getAPIKey();
  if (apiKey && apiKey.length > 5) {
    try {
      console.log("Attempting image edit via Gemini...");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: image.data, mimeType: image.mimeType } },
            { text: `Edit this image according to this prompt: ${prompt}. If there is text requested, ensure it is rendered accurately and legibly.` }
          ]
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData) {
        console.log("Gemini Image Edit successful");
        return `data:image/png;base64,${imgPart.inlineData.data}`;
      }
    } catch (geminiErr: any) {
      console.warn("Gemini image edit failed, falling back to server:", geminiErr.message);
    }
  }

  try {
    const response = await fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image: `data:${image.mimeType};base64,${image.data}`
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.image) return data.image;
      throw new Error("Server returned success but no image data");
    }
    
    let errorMessage = "Edit failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || errorMessage;
    } catch (e) {
      errorMessage = `Server error: ${response.status} ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  } catch (error: any) {
    console.error("Final Image edit error:", error);
    // Final Fallback: Generate new image
    return await generateImage(`Edit of previous image: ${prompt}`, aspectRatio);
  }
};

export const upscaleImage = async (image: { data: string, mimeType: string }) => {
  const apiKey = getAPIKey();
  if (!apiKey) throw new Error("API Key required for upscaling");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: image.data, mimeType: image.mimeType } },
          { text: "Upscale this image, enhance the details, and make it look high-resolution and professional. Maintain the original composition." }
        ]
      }
    });
    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData) return `data:image/png;base64,${imgPart.inlineData.data}`;
    throw new Error("No image generated by Gemini");
  } catch (error) {
    console.error("Image upscale error:", error);
    throw error;
  }
};

export const textToSpeech = async (text: string, voice: string = 'Kore') => {
  const apiKey = getAPIKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.warn("Gemini TTS failed");
    }
  }
  
  // Browser Fallback for TTS (No Key Required)
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    resolve(null); 
  });
};

export const generateCode = async (prompt: string) => {
  const codePrompt = `Generate a PROFESSIONAL-GRADE, multi-file web application for: ${prompt}. 
  Return the response as a JSON object with the following structure:
  {
    "files": {
      "index.html": "content",
      "styles.css": "content",
      "script.js": "content",
      "README.md": "content",
      ... any other necessary files (e.g., components, utils)
    },
    "mainFile": "index.html",
    "description": "Short description of the app"
  }
  
  Requirements:
  1. Modern, clean, and polished UI (use Tailwind CSS via CDN in index.html).
  2. Fully responsive design (works on mobile and desktop).
  3. Interactive elements and smooth animations.
  4. Well-structured and commented code across multiple files.
  5. Error handling and edge case management.
  6. Use Lucide Icons or Google Fonts via CDN.
  7. The index.html MUST correctly link to styles.css and script.js.
  
  Return ONLY the raw JSON object. Do not include markdown code blocks (\`\`\`json ... \`\`\`).`;
  
  const response = await chatWithAI(codePrompt, [], false);
  try {
    const cleanJson = response.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse AI JSON response, falling back to single file format", e);
    return {
      files: { "index.html": response },
      mainFile: "index.html",
      description: "Generated Application"
    };
  }
};

export const generateGame = async (prompt: string) => {
  const gamePrompt = `Create a HIGH-QUALITY, multi-file web-based game for: ${prompt}. 
  Return the response as a JSON object with the following structure:
  {
    "files": {
      "index.html": "content",
      "game.js": "content",
      "styles.css": "content",
      "assets.js": "content (optional)",
      "README.md": "content"
    },
    "mainFile": "index.html",
    "description": "Short description of the game"
  }

  Requirements:
  1. Professional game mechanics (use HTML5 Canvas or advanced DOM manipulation).
  2. Polished graphics and UI (use Tailwind CSS and modern design principles).
  3. Sound effects (simulated with Web Audio API if possible).
  4. Score tracking, levels, and "Game Over" states.
  5. Fully responsive (works with touch controls on mobile and keyboard on desktop).
  6. The index.html MUST correctly link to styles.css and game.js.
  7. Clear instructions on how to play in README.md.

  Return ONLY the raw JSON object. Do not include markdown code blocks (\`\`\`json ... \`\`\`).`;
  
  const response = await chatWithAI(gamePrompt, [], false);
  try {
    const cleanJson = response.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse AI JSON response, falling back to single file format", e);
    return {
      files: { "index.html": response },
      mainFile: "index.html",
      description: "Generated Game"
    };
  }
};
