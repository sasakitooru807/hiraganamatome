
import { GoogleGenAI } from "@google/genai";

// FIX: Initialize Gemini client using named parameter and direct environment variable access as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeToKana = async (text: string): Promise<string> => {
  const systemInstruction = `
    あなたは、こどもやお年寄りにもわかりやすいように、お話をまとめるガイドです。
    入力された文章を以下のルールでまとめてください：
    1. ひらがな、カタカナ、数字（0-9）、一部の記号（・、！？）のみを使用すること。漢字は絶対に使わない。
    2. 箇条書き（・ではじまる）で3つ程度にまとめること。
    3. 句読点やスペースを適度に入れ、一目で内容がわかるようにすること。
    4. 各行は短く、力強く書くこと。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    
    // FIX: Access response.text property directly as per guidelines.
    return response.text || "うまく まとめられませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
