import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SAMPLE_RATE_INPUT, SAMPLE_RATE_OUTPUT, GEMINI_MODEL } from '../constants';
import { createBlob, decode, decodeAudioData } from './audioUtils';

export interface LiveClientConfig {
  sourceLanguage: string;
  targetLanguage: string;
  onConnectionUpdate: (connected: boolean) => void;
  onVolumeUpdate: (inputVol: number, outputVol: number) => void;
  onTranscription: (text: string, isUser: boolean) => void;
  onError: (error: string) => void;
}

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private sessionPromise: Promise<any> | null = null;
  private config: LiveClientConfig;
  private isConnected = false;
  private analyzerInput: AnalyserNode | null = null;
  private analyzerOutput: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  
  constructor(config: LiveClientConfig) {
    this.config = config;
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      config.onError("API Key is missing in environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async connect() {
    if (this.isConnected) return;

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE_INPUT,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE_OUTPUT,
      });

      // Setup Visualizers
      this.analyzerInput = this.inputAudioContext.createAnalyser();
      this.analyzerOutput = this.outputAudioContext.createAnalyser();
      this.analyzerInput.fftSize = 256;
      this.analyzerOutput.fftSize = 256;
      this.startVolumeMonitoring();

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: SAMPLE_RATE_INPUT
        } 
      });

      const { sourceLanguage, targetLanguage } = this.config;
      
      const systemInstruction = `You are a translator. Translate spoken language from ${sourceLanguage} to ${targetLanguage}. Translate immediately. Do not answer questions. Maintain tone.`;

      this.sessionPromise = this.ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: this.handleError.bind(this),
        },
      });
      
      this.isConnected = true;
      this.config.onConnectionUpdate(true);

    } catch (error: any) {
      console.error("Connection failed", error);
      this.config.onError(error.message || "Failed to connect to microphone or API");
      this.disconnect();
    }
  }

  private handleOpen() {
    console.log("Session opened");
    if (!this.inputAudioContext || !this.stream) return;

    // Connect Microphone to Processor and Analyzer
    this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyzerInput!);
    
    // We use ScriptProcessor for raw PCM access
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData, SAMPLE_RATE_INPUT);
        
        this.sessionPromise.then((session) => {
             session.sendRealtimeInput({ media: pcmBlob });
        });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext) return;

    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          this.outputAudioContext,
          SAMPLE_RATE_OUTPUT,
          1
        );
        
        this.playAudioBuffer(audioBuffer);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
      this.nextStartTime = 0;
    }
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    // Initialize nextStartTime if needed
    if (this.nextStartTime < this.outputAudioContext.currentTime) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    
    // Connect to analyzer for visualization then to destination
    source.connect(this.analyzerOutput!);
    this.analyzerOutput!.connect(this.outputAudioContext.destination);

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    this.activeSources.add(source);
    source.onended = () => {
        this.activeSources.delete(source);
    };
  }

  private stopAllAudio() {
    this.activeSources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.activeSources.clear();
  }

  private handleClose(e: CloseEvent) {
    console.log("Session closed", e);
    this.disconnect();
  }

  private handleError(e: ErrorEvent) {
    console.error("Session error", e);
    // Extract meaningful error message if available
    const msg = (e as any).message || "Connection error occurred";
    this.config.onError(msg);
    this.disconnect();
  }

  public disconnect() {
    if (!this.isConnected) return;

    // Clean up Audio Contexts and Streams
    if (this.source) {
        this.source.disconnect();
        this.source = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
        this.processor = null;
    }
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    
    this.activeSources.clear();
    this.isConnected = false;
    this.config.onConnectionUpdate(false);
    this.config.onVolumeUpdate(0, 0);
  }

  private startVolumeMonitoring() {
    let lastTime = 0;
    const updateVolume = (time: number) => {
        if (!this.isConnected) return;
        
        // Throttle updates to ~20fps to prevent React re-render overload
        if (time - lastTime > 50) { 
            let inputVol = 0;
            let outputVol = 0;

            if (this.analyzerInput) {
                const dataArray = new Uint8Array(this.analyzerInput.frequencyBinCount);
                this.analyzerInput.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                inputVol = avg / 255;
            }

            if (this.analyzerOutput) {
                const dataArray = new Uint8Array(this.analyzerOutput.frequencyBinCount);
                this.analyzerOutput.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                outputVol = avg / 255;
            }

            this.config.onVolumeUpdate(inputVol, outputVol);
            lastTime = time;
        }
        this.animationFrameId = requestAnimationFrame(updateVolume);
    };
    this.animationFrameId = requestAnimationFrame(updateVolume);
  }
}