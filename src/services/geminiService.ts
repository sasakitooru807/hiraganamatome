import { GoogleGenAI } from "@google/genai";

// FIX: Initialize the Gemini client as per the coding guidelines.
// The non-null assertion (!) is used because the guidelines state to assume the API key is always present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const summarizeToKana = async (text: string): Promise<string> => {
  // FIX: Per coding guidelines, the check for API_KEY is removed.
  // The environment is assumed to be correctly configured.

  // FIX: Refactored to use systemInstruction for providing instructions to the model,
  // which is a better practice than embedding them in the user prompt.
  const systemInstruction = `以下の文章を、ひらがなとカタカナだけを使って、簡潔な箇条書きにしてください。
句読点やスペースを適切に使って、非常に読みやすくしてください。
箇条書きの各項目の先頭には「・」をつけてください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // FIX: The user's transcribed text is now the main content for the model.
      contents: text,
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API request failed:", error);
    throw new Error("Gemini APIとの通信に失敗しました。");
  }
};
