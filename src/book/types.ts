export type SupportedLanguage = 'RU' | 'EN' | 'DE';

export interface WordTiming {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface LanguageContent {
  audio: string | null;
  duration: number;
  fullText: string;
  words: WordTiming[];
}

export interface OverlayLayer {
  id: string;
  classes: string[];
  lang: SupportedLanguage | null;
  img: string | null;
  style: string;
  isTouchTarget: boolean;
}

export interface TouchTrigger {
  targetObject: string;
  animationId: string | null;
  sound: string | null;
  lang: string | null;
}

export interface BookScene {
  id: string;
  index: number;
  titles: Record<SupportedLanguage, string>;
  bgImage: string;
  ambientAudio: string | null;
  thumbnail: Record<SupportedLanguage, string>;
  languages: Record<SupportedLanguage, LanguageContent>;
  overlays: OverlayLayer[];
  touchTriggers: TouchTrigger[];
}

export interface BookManifest {
  title: string;
  englishTitle: string;
  author: string;
  aspectRatio: string;
  baseWidth: number;
  baseHeight: number;
  totalScenes: number;
  scenes: BookScene[];
}
