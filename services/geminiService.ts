
import { GoogleGenAI } from "@google/genai";

export const summarizeToKana = async (text: string): Promise<string> => {
  // APIキーはprocess.env.API_KEYから取得。インスタンスは呼び出しの度に作成し最新の状態を維持
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const systemInstruction = `
    あなたは「こども」や「ひらがなだけが読める人」のためのまとめ役です。
    入力された文章を、以下の【絶対ルール】で要約してください：

    【絶対ルール】
    1. ひらがな、カタカナ、数字、一部の記号（！、？、・）だけを使うこと。漢字は１文字も使ってはいけません。
    2. 内容を3つくらいの短い文章に分けること。
    3. 各文章の頭には「・」をつけること。
    4. 読みやすいように、適度に空白を入れること。
    
    例：
    ・きょうは　いい　てんきです
    ・おそとで　いっぱい　あそびました
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
    
    // .text プロパティを直接参照（メソッドではない）
    return response.text || "うまく まとめられませんでした。もういちど はなしてください。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
