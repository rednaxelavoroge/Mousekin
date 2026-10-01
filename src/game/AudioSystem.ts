export type Language = 'ru' | 'en' | 'de';

export interface NarrationTrack {
  id: string;
  ru: string;
  en: string;
  de: string;
  subtitles: {
    ru: string;
    en: string;
    de: string;
  };
}

export const SCENES_DATA: NarrationTrack[] = [
  {
    id: 'scene_0',
    ru: '/assets/audio/s00_narrationru.mp3',
    en: '/assets/audio/s00_narrationen.mp3',
    de: '/assets/audio/s00_narrationde.mp3',
    subtitles: {
      ru: '«Там, где заводится время... Мышонок в Часовьем городе»',
      en: '"Where time is born... The Little Mouse in Clocktown"',
      de: '"Wo die Zeit entsteht... Die kleine Maus in Uhrenstadt"'
    }
  },
  {
    id: 'scene_1',
    ru: '/assets/audio/s01_narrationru.mp3',
    en: '/assets/audio/s01_narrationen.mp3',
    de: '/assets/audio/s01_narrationde.mp3',
    subtitles: {
      ru: 'Мышонок открыл глаза и удивился... Он помнил, что ложился спать летом, а за окном — зима!',
      en: 'The Little Mouse opened his eyes and was amazed... He remembered going to sleep in summer, but outside it was winter!',
      de: 'Die kleine Maus öffnete die Augen und staunte... Sie erinnerte sich, im Sommer schlafen gegangen zu sein, aber draußen war Winter!'
    }
  },
  {
    id: 'scene_2',
    ru: '/assets/audio/s02_narrationru.mp3',
    en: '/assets/audio/s02_narrationen.mp3',
    de: '/assets/audio/s02_narrationde.mp3',
    subtitles: {
      ru: 'Он зажмурился и проснулся снова. Осень?! Потом Весна! Что-то определенно сломалось во Времени...',
      en: 'He blinked and woke up again. Autumn?! Then Spring! Something was definitely broken with Time...',
      de: 'Er blinzelte und wachte wieder auf. Herbst?! Dann Frühling! Etwas war definitiv mit der Zeit kaputt...'
    }
  }
];

export class SoundManager {
  private currentAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private currentLanguage: Language = 'ru';
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private onSubtitleChange?: (text: string) => void;

  constructor() {
    this.initMusic();
  }

  private initMusic() {
    this.musicAudio = new Audio('/assets/audio/intro.mp3');
    this.musicAudio.loop = true;
    this.musicAudio.volume = 0.25;
  }

  public setLanguage(lang: Language) {
    this.currentLanguage = lang;
  }

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  public setSubtitleCallback(cb: (text: string) => void) {
    this.onSubtitleChange = cb;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.muted = this.isMuted;
    }
    if (this.musicAudio) {
      this.musicAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  public playMusic() {
    if (this.musicAudio && !this.isPlaying) {
      this.musicAudio.play().then(() => {
        this.isPlaying = true;
      }).catch(e => console.log('Audio autoplay prevented:', e));
    }
  }

  public playSceneNarration(sceneIndex: number, onEnded?: () => void) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const scene = SCENES_DATA[sceneIndex];
    if (!scene) return;

    const audioUrl = scene[this.currentLanguage] || scene.ru;
    const subText = scene.subtitles[this.currentLanguage] || scene.subtitles.ru;

    if (this.onSubtitleChange) {
      this.onSubtitleChange(subText);
    }

    this.currentAudio = new Audio(audioUrl);
    this.currentAudio.muted = this.isMuted;
    this.currentAudio.volume = 0.95;

    this.currentAudio.onended = () => {
      if (onEnded) onEnded();
    };

    this.currentAudio.play().catch(err => {
      console.log('Voice narration playback waiting for interaction:', err);
    });
  }

  public playClockTick() {
    if (this.isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore
    }
  }

  public playSpringWinding() {
    if (this.isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  public playPurr() {
    const audio = new Audio('/assets/audio/murrr.mp3');
    audio.volume = 0.7;
    audio.muted = this.isMuted;
    audio.play().catch(() => {});
  }
}
