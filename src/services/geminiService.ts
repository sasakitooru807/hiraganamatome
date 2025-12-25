
import { GoogleGenAI } from "@google/genai";

// FIX: Initialize the Gemini client as per the coding guidelines using process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeToKana = async (text: string): Promise<string> => {
  // FIX: Refactored systemInstruction to provide instructions to the model.
  const systemInstruction = `以下の文章を、ひらがなとカタカナだけを使って、簡潔な箇条書きにしてください。
句読点やスペースを適切に使って、非常に読みやすくしてください。
箇条書きの各項目の先頭には「・」をつけてください。`;

  try {
    const response = await ai.models.generateContent({
      // FIX: Changed model to 'gemini-3-flash-preview' as 'gemini-2.5-flash' is not the recommended standard model for this task.
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        systemInstruction,
      },
    });

    // FIX: Access response.text property directly as per guidelines.
    return response.text || "うまく まとめられませんでした。";
  } catch (error) {
    console.error("Gemini API request failed:", error);
    throw new Error("Gemini APIとの通信に失敗しました。");
  }
};
