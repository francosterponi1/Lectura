
export enum Voice {
  KORE = 'Kore', // Woman / 1
  CHARON = 'Charon' // Man / 2 / Masc
}

export enum SelectionMode {
  AUTO = 'Automatic',
  KORE_ONLY = 'Kore_Only',
  CHARON_ONLY = 'Charon_Only'
}

export interface VoiceBlock {
  id: string;
  voice: Voice;
  text: string;
  order: number;
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export type AppStatus = 'idle' | 'parsing' | 'extracting' | 'synthesizing' | 'mastering' | 'completed' | 'error';
