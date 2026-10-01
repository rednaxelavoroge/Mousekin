export type Language = 'ru' | 'en' | 'de';

export interface NarrationTrack {
  id: string;
  chapterTitle: {
    ru: string;
    en: string;
    de: string;
  };
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
    chapterTitle: {
      ru: 'Пролог: Центр Мира',
      en: 'Prologue: Center of the World',
      de: 'Prolog: Zentrum der Welt'
    },
    ru: '/assets/audio/s00_narrationru.mp3',
    en: '/assets/audio/s00_narrationen.mp3',
    de: '/assets/audio/s00_narrationde.mp3',
    subtitles: {
      ru: '«Там, где заводится время... Когда живешь в центре мира, даже если твоя планета не очень большая, все равно чувствуешь себя кем-то особенным!»',
      en: '"Where time is born... When you live in the center of the world, even if your planet is not very big, you still feel someone truly special!"',
      de: '"Wo die Zeit entsteht... Wenn du im Zentrum der Welt lebst, fühlst du dich besonders!"'
    }
  },
  {
    id: 'scene_1',
    chapterTitle: {
      ru: 'Глава 1: Зима летом?!',
      en: 'Chapter 1: Winter in Summer?!',
      de: 'Kapitel 1: Winter im Sommer?!'
    },
    ru: '/assets/audio/s01_narrationru.mp3',
    en: '/assets/audio/s01_narrationen.mp3',
    de: '/assets/audio/s01_narrationde.mp3',
    subtitles: {
      ru: 'Мышонок открыл глаза и удивился... Он помнил, как ложился спать летним вечером, а теперь в открытую форточку кружатся снежинки. Зима?!',
      en: 'The Little Mouse opened his eyes and was amazed... He remembered going to sleep on a warm summer eve, but snowflakes were swirling through the window. Winter?!',
      de: 'Die kleine Maus öffnete die Augen und staunte... Im Sommer schlafen gegangen, aber draußen wirbeln Schneeflocken!'
    }
  },
  {
    id: 'scene_2',
    chapterTitle: {
      ru: 'Глава 2: Время сломалось!',
      en: 'Chapter 2: Time is Broken!',
      de: 'Kapitel 2: Die Zeit ist kaputt!'
    },
    ru: '/assets/audio/s02_narrationru.mp3',
    en: '/assets/audio/s02_narrationen.mp3',
    de: '/assets/audio/s02_narrationde.mp3',
    subtitles: {
      ru: 'Он зажмурился и проснулся снова. Осень?! А вслед за ней — весна! «Нет, дело явно не во мне, а со Временем. Пора выяснить, что там происходит!»',
      en: 'He blinked and woke up again. Autumn?! And then right away Spring! "No, the problem is definitely with Time. Let\'s see what is happening out there!"',
      de: 'Er blinzelte und wachte wieder auf. Herbst?! Und dann Frühling! "Das Problem liegt bei der Zeit. Schauen wir mal nach!"'
    }
  },
  {
    id: 'scene_3',
    chapterTitle: {
      ru: 'Глава 3: Полёт к Городу Часов',
      en: 'Chapter 3: Flight to Clocktown',
      de: 'Kapitel 3: Flug zur Uhrenstadt'
    },
    ru: '/assets/audio/s03_narrationru.mp3',
    en: '/assets/audio/s03_narrationen.mp3',
    de: '/assets/audio/s03_narrationde.mp3',
    subtitles: {
      ru: 'Мышонок распахнул дверь и шагнул в бескрайнее небо! Подхваченный пушистым облаком, он полетел к вратам Города Тикающих Часов и Звенящих Будильников.',
      en: 'The Little Mouse opened the door and stepped into the sky! Borne upon a gentle cloud, he floated down to the gates of Clocktown, the World of Running Time.',
      de: 'Die kleine Maus trat hinaus in den Himmel und schwebte auf einer Wolke zu den Toren der Uhrenstadt!'
    }
  },
  {
    id: 'scene_4',
    chapterTitle: {
      ru: 'Глава 4: Времясипед!',
      en: 'Chapter 4: The Timecycle!',
      de: 'Kapitel 4: Das Zeitrad!'
    },
    ru: '/assets/audio/s04_narrationru.mp3',
    en: '/assets/audio/s04_narrationen.mp3',
    de: '/assets/audio/s04_narrationde.mp3',
    subtitles: {
      ru: 'Вдруг прямо перед ним возник двухколесный Времясипед! Он запрыгнул на него и покатил по улочкам Часовьего города среди бегущих, отстающих и гигантских часов!',
      en: 'Suddenly a two-wheeled Timecycle appeared right before him! He hopped on and pedaled along the marvelous streets of Clocktown among ticking towers and alarms!',
      de: 'Plötzlich erschien ein zweirädriges Zeitrad! Er sprang auf und radelte durch die wunderbaren Straßen der Uhrenstadt!'
    }
  },
  {
    id: 'scene_5',
    chapterTitle: {
      ru: 'Глава 5: Улитка, Кот и Финал',
      en: 'Chapter 5: Snail, Cat & Harmony',
      de: 'Kapitel 5: Schnecke, Katze & Harmonie'
    },
    ru: '/assets/audio/s05_narrationru.mp3',
    en: '/assets/audio/s05_narrationen.mp3',
    de: '/assets/audio/s05_narrationde.mp3',
    subtitles: {
      ru: 'Встреча с Улиткой в центре Идеального Времени и сонный кот Мартин в архиве пыльных часов... Время нельзя запереть, оно прекрасно в настоящем мгновении!',
      en: 'A meeting with the Snail of Perfection and sleepy cat Martin in the archive of dusty clocks... Time cannot be hoarded; it is precious in every living moment!',
      de: 'Treffen mit der Schnecke und Kater Martin im Archiv der alten Uhren... Zeit lebt im gegenwärtigen Moment!'
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
    if (sceneIndex < 0 || sceneIndex >= SCENES_DATA.length) return;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const track = SCENES_DATA[sceneIndex];
    const audioSrc = track[this.currentLanguage];

    this.currentAudio = new Audio(audioSrc);
    this.currentAudio.muted = this.isMuted;
    this.currentAudio.volume = 0.95;

    if (this.onSubtitleChange) {
      this.onSubtitleChange(track.subtitles[this.currentLanguage]);
    }

    this.currentAudio.play().catch(e => {
      console.log('Autoplay prevented, requires user click:', e);
    });

    this.currentAudio.onended = () => {
      if (onEnded) onEnded();
    };
  }

  public playPurr() {
    const sfx = new Audio('/assets/audio/murrr.mp3');
    sfx.muted = this.isMuted;
    sfx.volume = 0.8;
    sfx.play().catch(() => {});
  }

  public playSpringWinding() {
    // Generate synthetic ticking / spring chime with Web Audio
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // AudioContext fallback
    }
  }
}
