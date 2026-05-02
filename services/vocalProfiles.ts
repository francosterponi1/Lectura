
import { Voice } from '../types';

export interface VocalBlueprint {
  identity: string;
  prebuiltVoice: string;
  masteringLevel: number;
  expressivityPrompt: string;
  samplingRate: number;
  textureLock: string;
}

/**
 * ARCHIVO INTERNO DE CONFIGURACIÓN AC1 (VOCAL BLUEPRINTS)
 * REFUERZO DE COHERENCIA Y LIMPIEZA SONORA:
 * Se ordena al motor generar audio con calidad de estudio profesional (HIFI).
 */
export const VOCAL_PROFILES: Record<Voice, VocalBlueprint> = {
  [Voice.KORE]: {
    identity: "Kore",
    prebuiltVoice: "Kore",
    masteringLevel: 0.95,
    textureLock: "Femenina, madurez media, tono aterciopelado pero firme.",
    expressivityPrompt: "DIRECTIVA DE CALIDAD AC1: Genera audio cristalino, calidad de estudio profesional, sin ruido de fondo ni artefactos. ANCLAJE DE IDENTIDAD: Tu timbre es inmutable (Vocal Lock: Kore). Habla siempre en un español latinoamericano neutro impecable. Realimentación: Mantén la misma curva de energía y volumen en cada frase. REGLA DE SIGLAS: Deletrea siglas (ej. E.M.I.) en INGLÉS exclusivamente.",
    samplingRate: 24000
  },
  [Voice.CHARON]: {
    identity: "Charon",
    prebuiltVoice: "Charon",
    masteringLevel: 0.95,
    textureLock: "Masculina, profunda, resonancia de pecho, autoridad amable.",
    expressivityPrompt: "DIRECTIVA DE CALIDAD AC1: Genera audio cristalino, calidad de estudio profesional, sin ruido de fondo ni artefactos. ANCLAJE DE IDENTIDAD: Tu timbre es inmutable (Vocal Lock: Charon). Habla siempre en un español latinoamericano neutro impecable. Realimentación: Tu profundidad vocal no debe oscilar; mantén la misma textura resonante. REGLA DE SIGLAS: Deletrea siglas (ej. E.M.I.) en INGLÉS exclusivamente.",
    samplingRate: 24000
  }
};
