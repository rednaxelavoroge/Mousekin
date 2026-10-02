import { WordTiming, SupportedLanguage } from './types';

export class AudioController {
  private narrationAudio: HTMLAudioElement;
  private ambientAudio: HTMLAudioElement;
  private sfxAudio: HTMLAudioElement;

  private isNarrationMuted: boolean = false;
  private isAmbientMuted: boolean = false;
  private isGlobalMuted: boolean = false;
  
  private currentWordTimings: WordTiming[] = [];
  private onWordHighlightCallback: ((wordId: string | null) => void) | null = null;
  private onNarrationEndCallback: (() => void) | null = null;
  private onNarrationStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  private currentAmbientUrl: string | null = null;
  private fadeInterval: number | null = null;

  constructor() {
    this.narrationAudio = new Audio();
    this.ambientAudio = new Audio();
    this.sfxAudio = new Audio();

    this.ambientAudio.loop = true;
    this.ambientAudio.volume = 0.35;
    this.narrationAudio.volume = 1.0;
    this.sfxAudio.volume = 0.8;

    this.setupNarrationListeners();
  }

  private setupNarrationListeners() {
    this.narrationAudio.addEventListener('timeupdate', () => {
      const time = this.narrationAudio.currentTime;
      this.checkWordHighlight(time);
    });

    this.narrationAudio.addEventListener('ended', () => {
      if (this.onWordHighlightCallback) {
        this.onWordHighlightCallback(null);
      }
      if (this.onNarrationStateChangeCallback) {
        this.onNarrationStateChangeCallback(false);
      }
      if (this.onNarrationEndCallback) {
        this.onNarrationEndCallback();
      }
    });

    this.narrationAudio.addEventListener('play', () => {
      if (this.onNarrationStateChangeCallback) {
        this.onNarrationStateChangeCallback(true);
      }
    });

    this.narrationAudio.addEventListener('pause', () => {
      if (this.onNarrationStateChangeCallback) {
        this.onNarrationStateChangeCallback(false);
      }
    });

    this.narrationAudio.addEventListener('error', (e) => {
      console.warn('Narration audio error:', e);
      if (this.onNarrationStateChangeCallback) {
        this.onNarrationStateChangeCallback(false);
      }
    });
  }

  private checkWordHighlight(currentTime: number) {
    if (!this.onWordHighlightCallback || this.currentWordTimings.length === 0) return;

    const activeWord = this.currentWordTimings.find(
      w => currentTime >= w.start && currentTime <= w.end
    );

    this.onWordHighlightCallback(activeWord ? activeWord.id : null);
  }

  public setWordHighlightCallback(cb: (wordId: string | null) => void) {
    this.onWordHighlightCallback = cb;
  }

  public setNarrationEndCallback(cb: () => void) {
    this.onNarrationEndCallback = cb;
  }

  public setNarrationStateChangeCallback(cb: (isPlaying: boolean) => void) {
    this.onNarrationStateChangeCallback = cb;
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http') || path.startsWith('//')) return path;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath.startsWith('book/') ? cleanPath : 'book/' + cleanPath}`;
  }

  public playNarration(audioPath: string | null, words: WordTiming[]) {
    this.currentWordTimings = words;
    if (this.onWordHighlightCallback) {
      this.onWordHighlightCallback(null);
    }

    if (!audioPath || this.isNarrationMuted || this.isGlobalMuted) {
      this.narrationAudio.pause();
      return;
    }

    const fullUrl = this.resolveUrl(audioPath);
    
    // Check if same track is already playing
    if (this.narrationAudio.src.endsWith(audioPath) && !this.narrationAudio.paused) {
      return;
    }

    this.narrationAudio.src = fullUrl;
    this.narrationAudio.currentTime = 0;
    this.narrationAudio.play().catch(err => {
      console.log('Narration autoplay prevented by browser (user interaction required):', err.message);
    });
  }

  public pauseNarration() {
    this.narrationAudio.pause();
  }

  public resumeNarration() {
    if (this.narrationAudio.src && !this.isNarrationMuted && !this.isGlobalMuted) {
      this.narrationAudio.play().catch(e => console.log('Resume error:', e));
    }
  }

  public isNarrationPlaying(): boolean {
    return !this.narrationAudio.paused && !this.narrationAudio.ended && this.narrationAudio.currentTime > 0;
  }

  public playAmbient(audioPath: string | null) {
    if (!audioPath || this.isAmbientMuted || this.isGlobalMuted) {
      this.stopAmbient(true);
      return;
    }

    const fullUrl = this.resolveUrl(audioPath);

    if (this.currentAmbientUrl === fullUrl && !this.ambientAudio.paused) {
      return; // Already playing this ambient track
    }

    this.currentAmbientUrl = fullUrl;
    this.ambientAudio.src = fullUrl;
    this.ambientAudio.volume = this.isAmbientMuted || this.isGlobalMuted ? 0 : 0.35;
    this.ambientAudio.play().catch(err => {
      console.log('Ambient play prevented (user gesture needed):', err.message);
    });
  }

  public stopAmbient(immediate = false) {
    if (immediate) {
      this.ambientAudio.pause();
      this.currentAmbientUrl = null;
      return;
    }

    // Gentle fade out
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    const step = 0.05;
    this.fadeInterval = window.setInterval(() => {
      if (this.ambientAudio.volume > step) {
        this.ambientAudio.volume -= step;
      } else {
        this.ambientAudio.pause();
        this.ambientAudio.volume = 0.35;
        this.currentAmbientUrl = null;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
      }
    }, 50);
  }

  public playSFX(audioPath: string | null) {
    if (!audioPath || this.isGlobalMuted) return;

    const fullUrl = this.resolveUrl(audioPath);
    const sfx = new Audio(fullUrl);
    sfx.volume = 0.75;
    sfx.play().catch(e => console.log('SFX play error:', e));
  }

  public toggleNarrationMute(): boolean {
    this.isNarrationMuted = !this.isNarrationMuted;
    if (this.isNarrationMuted) {
      this.narrationAudio.pause();
    } else {
      this.narrationAudio.play().catch(() => {});
    }
    return this.isNarrationMuted;
  }

  public toggleAmbientMute(): boolean {
    this.isAmbientMuted = !this.isAmbientMuted;
    if (this.isAmbientMuted) {
      this.ambientAudio.pause();
    } else if (this.currentAmbientUrl) {
      this.ambientAudio.play().catch(() => {});
    }
    return this.isAmbientMuted;
  }

  public getNarrationMuted(): boolean {
    return this.isNarrationMuted;
  }

  public getAmbientMuted(): boolean {
    return this.isAmbientMuted;
  }

  public stopAll() {
    this.narrationAudio.pause();
    this.ambientAudio.pause();
    this.sfxAudio.pause();
  }
}
