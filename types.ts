export interface Language {
  code: string;
  name: string;
  flag: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface TranscriptionItem {
  id: string;
  text: string;
  isUser: boolean; // true for source (user), false for target (model)
  timestamp: Date;
}

export interface AudioVolume {
  input: number; // 0-1
  output: number; // 0-1
}