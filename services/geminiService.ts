
import { GoogleGenAI, Modality } from "@google/genai";
import { Voice } from "../types";
import { VOCAL_PROFILES } from "./vocalProfiles";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Generates audio using the internal AC1 Vocal Blueprint.
   * Invokes profile metadata (Timbre + Expressivity) for identity lock.
   */
  async generateTTS(text: string, voice: Voice): Promise<string> {
    const profile = VOCAL_PROFILES[voice];
    
    // Combining the user text with the immutable expressivity instructions from the blueprint
    const masteredPrompt = `${profile.expressivityPrompt}\nTexto a decir: ${text}`;
    
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: masteredPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: profile.prebuiltVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error(`Error en motor AC1: No se pudo capturar el timbre de ${profile.identity}`);
    
    return base64Audio;
  }

  /**
   * Extracts text from images or PDF using gemini-3-flash-preview.
   */
  async extractTextFromFile(base64Data: string, mimeType: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: "Extrae todo el texto de este archivo de forma exacta. Mantén el formato de líneas." }
          ]
        }
      ]
    });

    return response.text || "";
  }
}

export const geminiService = new GeminiService();
