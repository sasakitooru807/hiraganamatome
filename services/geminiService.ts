
import { GoogleGenAI } from "@google/genai";

export const summarizeToKana = async (text: string): Promise<string> => {
  // Always use new GoogleGenAI({apiKey: process.env.API_KEY}) inside the function or at the top level
  // ensuring it uses the provided environment variable.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const systemInstruction = `
    あなたは「こども」や「ひらがなだけをよむひと」のためのまとめやくです。
    おはなしされた ないようを、以下の【ルール】でまとめてください。

    【ルール】
    1. ぜったいに「かんじ」をつかわないでください。
    2. ひらがな、カタカナ、すうじ、きごう（！、？、・）だけをつかいます。
    3. 3つの「・」ではじまる ぶんしょうにしてください。
    4. とても よみやすいように、すぺーす（くうはく）を いれてください。
    
    例：
    ・きょうは　いい　てんき　でした
    ・みんなで　おそとで　あそびました
    ・とても　たのしかったです
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
    
    // Use .text property directly (it's a getter, not a method)
    const resultText = response.text;
    return resultText || "うまく まとめられませんでした。もういちど おねがいします。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
