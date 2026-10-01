import confetti from 'canvas-confetti';
import { DioramaScene } from './DioramaScene';
import { SoundManager, Language, SCENES_DATA } from './AudioSystem';
import { Season } from './SeasonParticles';

export class GameController {
  private diorama: DioramaScene;
  private soundManager: SoundManager;
  private currentSceneIndex: number = 0;
  private currentSeason: Season = 'summer';

  // UI Elements
  private hudContainer: HTMLElement;
  private subtitleEl: HTMLElement;
  private sceneTitleEl: HTMLElement;

  constructor(diorama: DioramaScene, soundManager: SoundManager, hudContainer: HTMLElement) {
    this.diorama = diorama;
    this.soundManager = soundManager;
    this.hudContainer = hudContainer;

    this.subtitleEl = document.createElement('div');
    this.sceneTitleEl = document.createElement('div');

    this.buildHUD();
    this.setupStoryHooks();
  }

  private chapterBar: HTMLElement | null = null;
  private hintBadge: HTMLElement | null = null;

  private buildHUD() {
    this.hudContainer.innerHTML = '';
    this.hudContainer.className = 'absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 select-none';

    // Top Bar: Scene Title, Chapter Pills, Language & Sound controls
    const topBar = document.createElement('div');
    topBar.className = 'w-full flex items-center justify-between gap-3 flex-wrap';

    // Back to Landing button
    const backBtn = document.createElement('button');
    backBtn.className = 'pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-md text-amber-200 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg active:scale-95';
    backBtn.innerHTML = `<span>⟵</span> <span>В меню</span>`;
    backBtn.onclick = () => {
      window.dispatchEvent(new CustomEvent('close-game'));
    };

    // Chapter Navigator Pills Bar
    this.chapterBar = document.createElement('div');
    this.chapterBar.className = 'pointer-events-auto bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-full p-1 flex items-center gap-1 shadow-2xl overflow-x-auto max-w-[90vw] sm:max-w-none';

    const chapters = [
      { idx: 0, label: 'Спальня', icon: '🛏️' },
      { idx: 1, label: 'Зима', icon: '❄️' },
      { idx: 2, label: 'Осень', icon: '🍂' },
      { idx: 3, label: 'Полёт', icon: '☁️' },
      { idx: 4, label: 'Времясипед', icon: '🚲' },
      { idx: 5, label: 'Финал', icon: '🐌' }
    ];

    chapters.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = `chapter-btn px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
        this.currentSceneIndex === ch.idx
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-105'
          : 'text-amber-100/70 hover:text-white hover:bg-white/10'
      }`;
      btn.dataset.chapter = ch.idx.toString();
      btn.innerHTML = `<span>${ch.icon}</span> <span class="hidden md:inline">${ch.label}</span>`;
      btn.onclick = () => {
        this.currentSceneIndex = ch.idx;
        this.applyScene(ch.idx);
      };
      this.chapterBar!.appendChild(btn);
    });

    // Right Controls: Audio & Language
    const rightControls = document.createElement('div');
    rightControls.className = 'pointer-events-auto flex items-center gap-2';

    // Audio Narration button
    const narrateBtn = document.createElement('button');
    narrateBtn.id = 'narrate-play-btn';
    narrateBtn.className = 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95';
    narrateBtn.innerHTML = `<span>🎙️</span> <span>Озвучка</span>`;
    narrateBtn.onclick = () => {
      this.soundManager.playSceneNarration(this.currentSceneIndex);
    };

    // Mute toggle
    const muteBtn = document.createElement('button');
    muteBtn.className = 'bg-black/40 hover:bg-black/60 border border-white/20 text-white p-2 rounded-full text-xs backdrop-blur-md transition-all shadow-md active:scale-95';
    muteBtn.innerHTML = `🔊`;
    muteBtn.onclick = () => {
      const isMuted = this.soundManager.toggleMute();
      muteBtn.innerHTML = isMuted ? `🔇` : `🔊`;
    };

    // Language Dropdown / Toggle
    const langBtn = document.createElement('button');
    langBtn.className = 'bg-black/40 hover:bg-black/60 border border-amber-400/30 text-amber-300 px-2.5 py-1.5 rounded-full text-xs font-bold uppercase backdrop-blur-md transition-all shadow-md';
    langBtn.innerHTML = this.soundManager.getLanguage();
    langBtn.onclick = () => {
      const langs: Language[] = ['ru', 'en', 'de'];
      const nextIdx = (langs.indexOf(this.soundManager.getLanguage()) + 1) % langs.length;
      const nextLang = langs[nextIdx];
      this.soundManager.setLanguage(nextLang);
      langBtn.innerHTML = nextLang;
      this.updateSubtitle(SCENES_DATA[this.currentSceneIndex].subtitles[nextLang]);
    };

    rightControls.appendChild(narrateBtn);
    rightControls.appendChild(muteBtn);
    rightControls.appendChild(langBtn);

    topBar.appendChild(backBtn);
    topBar.appendChild(this.chapterBar);
    topBar.appendChild(rightControls);
    this.hudContainer.appendChild(topBar);

    // 3D Orbit helper hint in corner
    this.hintBadge = document.createElement('div');
    this.hintBadge.className = 'pointer-events-none self-end bg-black/50 backdrop-blur-md border border-amber-500/20 text-amber-200/90 text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl mt-2 transition-all';
    this.hintBadge.innerHTML = `<span>🔄</span> <span>Тяните экран, чтобы вращать 3D сцену на 360°</span>`;
    this.hudContainer.appendChild(this.hintBadge);

    // Bottom Area: Subtitle Bubble & Scene Stepper
    const bottomArea = document.createElement('div');
    bottomArea.className = 'w-full flex flex-col items-center gap-3 mb-2';

    // Subtitle Bubble
    this.subtitleEl.className = 'pointer-events-auto max-w-2xl bg-black/80 backdrop-blur-lg border border-amber-400/40 text-amber-100 px-6 py-3.5 rounded-2xl text-center text-sm md:text-base leading-relaxed shadow-2xl transition-all duration-300';
    this.subtitleEl.innerHTML = SCENES_DATA[0].subtitles.ru;
    bottomArea.appendChild(this.subtitleEl);

    // Scene Navigation Bar
    const navBar = document.createElement('div');
    navBar.className = 'pointer-events-auto flex items-center gap-3';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'bg-black/50 hover:bg-black/70 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all active:scale-95';
    prevBtn.innerHTML = `◀ Назад`;
    prevBtn.onclick = () => this.prevScene();

    const nextBtn = document.createElement('button');
    nextBtn.className = 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95';
    nextBtn.innerHTML = `<span>Далее</span> <span>▶</span>`;
    nextBtn.onclick = () => this.nextScene();

    navBar.appendChild(prevBtn);
    navBar.appendChild(nextBtn);
    bottomArea.appendChild(navBar);

    this.hudContainer.appendChild(bottomArea);
  }

  private setupStoryHooks() {
    this.soundManager.setSubtitleCallback((text) => {
      this.updateSubtitle(text);
    });

    this.diorama.setInteractionCallback((name) => {
      if (name === 'mouse') {
        const compliments = [
          'Мышонок приветствует тебя! «Привет, друг!»',
          '«Я живу в центре мира и чувствую себя особенным!»',
          '«Время — это игрушка Вечности!»',
          'Мышонок весело подпрыгнул в воздухе!'
        ];
        const pick = compliments[Math.floor(Math.random() * compliments.length)];
        this.updateSubtitle(pick);
      } else if (name === 'clock') {
        const seasonsList: Season[] = ['winter', 'autumn', 'spring', 'summer'];
        const nextSeason = seasonsList[(seasonsList.indexOf(this.currentSeason) + 1) % seasonsList.length];
        this.changeSeason(nextSeason);
        this.updateSubtitle('🕰️ Время ускорилось! Стрелки будильника крутятся, меняя времена года!');
      } else if (name === 'window') {
        this.updateSubtitle('🪟 Окошко распахнулось в панораму Часового Города!');
      } else if (name === 'cat') {
        this.updateSubtitle('🐱 Пушистый Кот Мартин громко замурлыкал от удовольствия!');
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } else if (name === 'gear') {
        this.updateSubtitle('⚙️ Золотая шестерёнка собрана! Механизм Часов ускоряет свой ход!');
      }
    });
  }

  public changeSeason(season: Season) {
    this.currentSeason = season;
    this.diorama.setSeason(season);
  }

  public updateSubtitle(text: string) {
    this.subtitleEl.style.opacity = '0';
    setTimeout(() => {
      this.subtitleEl.innerHTML = text;
      this.subtitleEl.style.opacity = '1';
    }, 150);
  }

  public nextScene() {
    if (this.currentSceneIndex < SCENES_DATA.length - 1) {
      this.currentSceneIndex++;
      this.applyScene(this.currentSceneIndex);
    } else {
      // Reached grand finale -> Celebration confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      this.updateSubtitle('🌟 Сказка завершена! Мышонок, Улитка Матильда и Кот Мартин благодарят вас за путешествие по Часовому Городу!');
    }
  }

  public prevScene() {
    if (this.currentSceneIndex > 0) {
      this.currentSceneIndex--;
      this.applyScene(this.currentSceneIndex);
    }
  }

  private applyScene(idx: number) {
    const scene = SCENES_DATA[idx];
    const lang = this.soundManager.getLanguage();
    this.updateSubtitle(scene.subtitles[lang]);
    this.soundManager.playSceneNarration(idx);

    // Switch 3D Diorama Stage
    this.diorama.setChapter(idx);

    // Update active chapter button highlight
    if (this.chapterBar) {
      const btns = this.chapterBar.querySelectorAll<HTMLButtonElement>('.chapter-btn');
      btns.forEach(btn => {
        if (btn.dataset.chapter === idx.toString()) {
          btn.className = 'chapter-btn px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-105';
        } else {
          btn.className = 'chapter-btn px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all text-amber-100/70 hover:text-white hover:bg-white/10';
        }
      });
    }

    // Dynamic Hints per Chapter
    if (this.hintBadge) {
      const hints = [
        '✨ Тапните на Мышонка или Будильник, вращайте спальню на 360°',
        '❄️ Зимнее время года: покрутите стрелки будильника!',
        '🍂 Осенний вечер: нажмите на мансардное окно!',
        '☁️ Полёт в небесах: собирайте золотые шестерёнки в воздухе!',
        '🚲 Времясипед в Часовом Городе: исследуйте улицы времени!',
        '🐌 Улитка Матильда и 🐱 Кот Мартин: погладьте пушистого кота!'
      ];
      this.hintBadge.innerHTML = `<span>💡</span> <span>${hints[idx] || hints[0]}</span>`;
    }

    if (idx === 5) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
  }
}
