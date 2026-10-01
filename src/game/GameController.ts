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

  private buildHUD() {
    this.hudContainer.innerHTML = '';
    this.hudContainer.className = 'absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 select-none';

    // Top Bar: Scene Title, Season Pills, Language & Sound controls
    const topBar = document.createElement('div');
    topBar.className = 'w-full flex items-center justify-between gap-3 flex-wrap';

    // Back to Landing button
    const backBtn = document.createElement('button');
    backBtn.className = 'pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-md text-amber-200 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg active:scale-95';
    backBtn.innerHTML = `<span>⟵</span> <span>В меню</span>`;
    backBtn.onclick = () => {
      window.dispatchEvent(new CustomEvent('close-game'));
    };

    // Seasons Pill Bar
    const seasonBar = document.createElement('div');
    seasonBar.className = 'pointer-events-auto bg-black/50 backdrop-blur-md border border-amber-500/20 rounded-full p-1 flex items-center gap-1 shadow-xl';

    const seasons: { id: Season; label: string; icon: string }[] = [
      { id: 'summer', label: 'Лето', icon: '☀️' },
      { id: 'winter', label: 'Зима', icon: '❄️' },
      { id: 'autumn', label: 'Осень', icon: '🍂' },
      { id: 'spring', label: 'Весна', icon: '🌸' }
    ];

    seasons.forEach(s => {
      const btn = document.createElement('button');
      btn.className = `season-btn px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
        this.currentSeason === s.id
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
          : 'text-amber-100/70 hover:text-white hover:bg-white/10'
      }`;
      btn.dataset.season = s.id;
      btn.innerHTML = `<span>${s.icon}</span> <span class="hidden sm:inline">${s.label}</span>`;
      btn.onclick = () => {
        this.changeSeason(s.id);
        this.soundManager.playSpringWinding();
      };
      seasonBar.appendChild(btn);
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
    topBar.appendChild(seasonBar);
    topBar.appendChild(rightControls);
    this.hudContainer.appendChild(topBar);

    // 3D Orbit helper hint in corner
    const hintBadge = document.createElement('div');
    hintBadge.className = 'pointer-events-none self-end bg-black/40 backdrop-blur-md border border-white/10 text-white/70 text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md mt-2';
    hintBadge.innerHTML = `<span>🔄</span> <span>Тяни пальцем или мышью, чтобы вращать 3D комнату</span>`;
    this.hudContainer.appendChild(hintBadge);

    // Bottom Area: Subtitle Bubble & Scene Stepper
    const bottomArea = document.createElement('div');
    bottomArea.className = 'w-full flex flex-col items-center gap-3 mb-2';

    // Subtitle Bubble
    this.subtitleEl.className = 'pointer-events-auto max-w-2xl bg-black/75 backdrop-blur-lg border border-amber-400/30 text-amber-100 px-6 py-3.5 rounded-2xl text-center text-sm md:text-base leading-relaxed shadow-2xl transition-all duration-300';
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
          'Мышонок весело подпрыгнул!'
        ];
        const pick = compliments[Math.floor(Math.random() * compliments.length)];
        this.updateSubtitle(pick);
      } else if (name === 'clock') {
        // Warp time!
        const seasonsList: Season[] = ['winter', 'autumn', 'spring', 'summer'];
        const nextSeason = seasonsList[(seasonsList.indexOf(this.currentSeason) + 1) % seasonsList.length];
        this.changeSeason(nextSeason);
        this.updateSubtitle('🕰️ Время ускорилось! Стрелки крутятся, и время года изменилось!');
      } else if (name === 'window') {
        this.updateSubtitle('🪟 Окошко распахнулось в сказочный Часовий Город!');
      }
    });
  }

  public changeSeason(season: Season) {
    this.currentSeason = season;
    this.diorama.setSeason(season);

    // Update active button state
    const btns = this.hudContainer.querySelectorAll<HTMLButtonElement>('.season-btn');
    btns.forEach(btn => {
      if (btn.dataset.season === season) {
        btn.className = 'season-btn px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md';
      } else {
        btn.className = 'season-btn px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all text-amber-100/70 hover:text-white hover:bg-white/10';
      }
    });
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
      // Reached end of prologue -> Celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      this.updateSubtitle('🌟 Вы разбудили Мышонка! Впереди — врата Часовьего города и встреча с Улиткой Матильдой!');
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

    if (idx === 1) {
      this.changeSeason('winter');
    } else if (idx === 2) {
      this.changeSeason('autumn');
    }
  }
}
