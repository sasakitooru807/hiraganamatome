import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const summarizeToKana = async (text: string): Promise<string> => {
  const systemInstruction = `
    以下の文章を、ひらがな、カタカナ、アラビア数字だけを使って、簡潔な箇条書きにしてください。
    句読点やスペースを適切に使って、非常に読みやすくしてください。
    箇条書きの各項目の先頭には「・」をつけてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `"${text}"`,
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