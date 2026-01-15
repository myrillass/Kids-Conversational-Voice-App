
export interface Transcription {
  text: string;
  isUser: boolean;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export type CharacterType = 'Luna' | 'Cica' | 'Sharky' | 'Titi';

export interface UserProfile {
  name: string;
  character: CharacterType;
  age: number;
}
