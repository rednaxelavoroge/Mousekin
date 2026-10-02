import { BookManifest, BookScene, SupportedLanguage, WordTiming } from './types';
import { AudioController } from './AudioController';

export class BookViewer {
  private container: HTMLElement;
  private manifest: BookManifest | null = null;
  private currentSceneIndex: number = 0;
  private currentLang: SupportedLanguage = 'RU';
  private autoTurnPages: boolean = true;
  private isChapterDrawerOpen: boolean = false;
  private isUserInteracted: boolean = false;
  private autoTurnTimer: number | null = null;

  private audioController: AudioController;

  // DOM elements
  private stageWrapper!: HTMLElement;
  private sceneFrame!: HTMLElement;
  private bgLayer!: HTMLImageElement;
  private overlaysLayer!: HTMLElement;
  private ambientBackdrop!: HTMLElement;
  private subtitlesViewport!: HTMLElement;
  private textContainer!: HTMLElement;
  private progressIndicator!: HTMLElement;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private playPauseButton!: HTMLButtonElement;
  private ambientToggleButton!: HTMLButtonElement;
  private autoTurnButton!: HTMLButtonElement;
  private drawerElement!: HTMLElement;
  private subtitlesPanel!: HTMLElement;
  private toggleSubtitlesButton!: HTMLButtonElement;
  private isSubtitlesVisible: boolean = true;

  // Touch gesture state
  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.audioController = new AudioController();

    this.audioController.setWordHighlightCallback((wordId) => {
      this.highlightWord(wordId);
    });

    this.audioController.setNarrationEndCallback(() => {
      if (this.autoTurnPages && this.manifest && this.currentSceneIndex < this.manifest.totalScenes - 1) {
        this.clearAutoTurnTimer();
        this.autoTurnTimer = window.setTimeout(() => {
          this.goToScene(this.currentSceneIndex + 1);
        }, 1500);
      }
    });

    this.audioController.setNarrationStateChangeCallback((isPlaying) => {
      this.updatePlayPauseIcon(isPlaying);
    });

    this.initLayout();
    this.bindGlobalEvents();
    this.loadBookData();
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http') || path.startsWith('//')) return path;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath.startsWith('book/') ? cleanPath : 'book/' + cleanPath}`;
  }

  private clearAutoTurnTimer() {
    if (this.autoTurnTimer !== null) {
      window.clearTimeout(this.autoTurnTimer);
      this.autoTurnTimer = null;
    }
  }

  private async loadBookData() {
    try {
      const dataUrl = this.resolveUrl('book_data.json');
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.manifest = await response.json();
      this.renderChapterDrawer();

      // Restore user's last visited scene from localStorage
      const saved = localStorage.getItem('mousekin_last_scene');
      const savedIndex = saved !== null ? parseInt(saved, 10) : 0;
      const total = this.manifest ? this.manifest.totalScenes : 22;
      const initialScene = (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < total) ? savedIndex : 0;

      this.goToScene(initialScene, false);
    } catch (err) {
      console.error('Failed to load book manifest:', err);
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-screen text-center p-6">
          <div class="bg-red-950/80 border border-red-500 rounded-2xl p-8 max-w-md">
            <h2 class="text-2xl font-bold text-red-300 mb-4">Ошибка загрузки книги</h2>
            <p class="text-slate-300 text-sm mb-4">Не удалось прочитать book_data.json</p>
            <button onclick="location.reload()" class="px-6 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg">Повторить</button>
          </div>
        </div>
      `;
    }
  }

  private initLayout() {
    this.container.innerHTML = `
      <div id="book-viewer" class="relative w-full h-full overflow-hidden select-none bg-[#0a0814] flex flex-col justify-between">
        <!-- Ambient blurred backdrop -->
        <div id="ambient-backdrop" class="absolute inset-0 z-0 bg-cover bg-center filter blur-3xl opacity-40 scale-110 pointer-events-none transition-all duration-700"></div>

        <!-- TOP BAR / HUD -->
        <header class="relative z-30 w-full px-3 py-2 sm:px-6 sm:py-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div class="flex items-center gap-2 sm:gap-4">
            <button id="btn-drawer" class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-2 text-xs sm:text-sm font-medium transition backdrop-blur-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
              <span class="hidden sm:inline">Главы</span>
            </button>
            <div id="progress-indicator" class="text-xs sm:text-sm font-semibold tracking-wide text-amber-300 bg-black/40 px-3 py-1 rounded-full border border-amber-500/20 backdrop-blur-sm">
              Глава 0 / 21
            </div>
          </div>

          <!-- Language Selector & Audio Controls -->
          <div class="flex items-center gap-1.5 sm:gap-3">
            <div class="bg-black/50 p-0.5 sm:p-1 rounded-xl border border-white/15 flex items-center gap-0.5 backdrop-blur-md">
              <button data-lang="RU" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'RU' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">RU</button>
              <button data-lang="EN" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'EN' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">EN</button>
              <button data-lang="DE" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'DE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">DE</button>
            </div>

            <button id="btn-ambient" title="Фоновая музыка" class="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md">
              <svg id="icon-music-on" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
            </button>

            <button id="btn-auto-turn" title="Автоматическое перелистывание" class="p-2 sm:px-3 sm:py-1.5 rounded-xl border transition backdrop-blur-md text-xs font-medium flex items-center gap-1.5 ${this.autoTurnPages ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/10 border-white/15 text-slate-400'}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
              <span class="hidden md:inline">Авто</span>
            </button>

            <button id="btn-fullscreen" title="На весь экран" class="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            </button>
          </div>
        </header>

        <!-- MAIN BOOK STAGE (1024x768 Container) -->
        <main class="relative z-10 flex-1 w-full flex items-center justify-center px-1 sm:px-4 py-1 overflow-hidden">
          <div id="stage-wrapper" class="relative shadow-2xl rounded-2xl overflow-hidden border border-amber-500/20 bg-black/60 transition-transform duration-300">
            <!-- 1024x768 virtual canvas frame -->
            <div id="scene-frame" class="relative w-[1024px] h-[768px] origin-top-left overflow-hidden bg-black select-none">
              <!-- Base background illustration -->
              <img id="scene-bg" src="" alt="Scene" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none" />

              <!-- Overlay Layers & Interactive Characters -->
              <div id="scene-overlays" class="absolute inset-0 w-full h-full"></div>

              <!-- Interactive Hint Indicator -->
              <div id="touch-hint" class="absolute bottom-6 right-6 z-20 pointer-events-none opacity-0 transition-opacity duration-500 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-400/30 px-3 py-1.5 rounded-full text-amber-200 text-xs shadow-lg">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Нажимай на картинки и персонажей!</span>
              </div>
            </div>
          </div>

          <!-- Navigation Arrow Buttons -->
          <button id="btn-prev-page" class="absolute left-2 sm:left-6 z-30 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-amber-600/80 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button id="btn-next-page" class="absolute right-2 sm:right-6 z-30 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-amber-600/80 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </button>
        </main>

        <!-- BOTTOM READING STRIP (COMPACT TELEPROMPTER) & AUDIO CONTROLS -->
        <footer id="text-blade" class="relative z-30 w-full px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col items-center">
          
          <!-- SLEEK UNIFORM READING STRIP (Fixed height: exactly 2 lines, smooth vertical auto-scroll, hideable) -->
          <div id="subtitles-panel" class="w-full max-w-3xl h-[56px] sm:h-[64px] relative rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-xl px-3 sm:px-5 flex items-center justify-between overflow-hidden transition-all duration-300">
            <div id="subtitles-viewport" class="flex-1 h-full overflow-y-hidden select-none py-1.5 text-center" style="-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);">
              <p id="subtitles-container" class="text-sm sm:text-lg md:text-xl text-slate-100 font-sans leading-relaxed tracking-wide transition-all">
                <span class="text-amber-200/80 italic">Загрузка сказки...</span>
              </p>
            </div>
            <button id="btn-close-subtitles" title="Скрыть текст (читать без субтитров)" class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 transition ml-2 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Quick Audio & Subtitle Controls Bar -->
          <div class="mt-2 flex items-center gap-3 sm:gap-4">
            <!-- T BUTTON: Toggle Subtitles On/Off -->
            <button id="btn-toggle-subtitles" title="Показать/скрыть субтитры (Т)" class="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-md bg-amber-500/20 border-amber-400/50 text-amber-300">
              <span class="font-serif text-sm font-black">Т</span>
              <span class="hidden sm:inline text-xs">Субтитры</span>
            </button>

            <button id="btn-replay-narration" title="Повторить озвучку" class="p-1.5 text-slate-400 hover:text-white transition">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>

            <button id="btn-play-pause" class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/30 transform hover:scale-105 active:scale-95 transition">
              <svg id="icon-play" class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg id="icon-pause" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>

            <button id="btn-mute-narration" title="Включить/выключить голос" class="p-1.5 text-slate-400 hover:text-white transition">
              <svg id="icon-voice-on" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            </button>
          </div>
        </footer>

        <!-- CHAPTERS SLIDE-OVER DRAWER -->
        <aside id="chapter-drawer" class="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-[#120f24]/95 backdrop-blur-2xl border-r border-amber-500/20 shadow-2xl transform -translate-x-full transition-transform duration-300 flex flex-col">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 class="text-lg font-bold text-amber-300">Содержание сказки</h3>
            <button id="btn-close-drawer" class="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="drawer-items" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
        </aside>

        <!-- Initial Start Modal overlay for sound autoplay permission -->
        <div id="start-overlay" class="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div class="max-w-md w-full bg-[#18132e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl"></div>
            <img id="cover-img" src="" alt="Cover" class="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 border border-amber-500/40 shadow-xl" />
            <h1 class="text-2xl sm:text-3xl font-extrabold text-amber-300 mb-2 font-serif">Мышонок в Часовьем городе</h1>
            <p class="text-xs sm:text-sm text-slate-300 mb-6">Оригинальная интерактивная сказка с живой озвучкой, пословной подсветкой и атмосферной музыкой.</p>
            <button id="btn-start-reading" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-lg shadow-xl shadow-amber-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>Открыть книгу</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this.stageWrapper = document.getElementById('stage-wrapper')!;
    this.sceneFrame = document.getElementById('scene-frame')!;
    this.bgLayer = document.getElementById('scene-bg') as HTMLImageElement;
    this.overlaysLayer = document.getElementById('scene-overlays')!;
    this.ambientBackdrop = document.getElementById('ambient-backdrop')!;
    this.subtitlesViewport = document.getElementById('subtitles-viewport')!;
    this.textContainer = document.getElementById('subtitles-container')!;
    this.progressIndicator = document.getElementById('progress-indicator')!;
    this.prevButton = document.getElementById('btn-prev-page') as HTMLButtonElement;
    this.nextButton = document.getElementById('btn-next-page') as HTMLButtonElement;
    this.playPauseButton = document.getElementById('btn-play-pause') as HTMLButtonElement;
    this.ambientToggleButton = document.getElementById('btn-ambient') as HTMLButtonElement;
    this.autoTurnButton = document.getElementById('btn-auto-turn') as HTMLButtonElement;
    this.drawerElement = document.getElementById('chapter-drawer')!;
    this.subtitlesPanel = document.getElementById('subtitles-panel')!;
    this.toggleSubtitlesButton = document.getElementById('btn-toggle-subtitles') as HTMLButtonElement;

    // Subtitle toggles
    this.toggleSubtitlesButton?.addEventListener('click', () => {
      this.toggleSubtitles();
    });

    document.getElementById('btn-close-subtitles')?.addEventListener('click', () => {
      this.toggleSubtitles(false);
    });

    const coverImg = document.getElementById('cover-img') as HTMLImageElement;
    if (coverImg) {
      coverImg.src = this.resolveUrl('images/Cover_4B38A2B5-F5D2-4DB4-BD47-54C063EE51AB_iBooks.jpg');
    }

    this.onResize();
  }

  private bindGlobalEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.prevPage();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.togglePlayPause();
      }
    });

    // Touch gestures for swipe
    const viewer = document.getElementById('book-viewer')!;
    viewer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        // Don't trigger swipe if touching drawer or interactive elements
        if (target.closest('#chapter-drawer') || target.closest('button')) {
          this.isSwiping = false;
          return;
        }
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isSwiping = true;
      }
    }, { passive: true });

    viewer.addEventListener('touchend', (e) => {
      if (!this.isSwiping || e.changedTouches.length === 0) return;
      this.isSwiping = false;
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;
      const deltaY = e.changedTouches[0].clientY - this.touchStartY;

      // Strict horizontal swipe requirement to avoid accidental page turns
      if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 2.0) {
        if (deltaX < 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      }
    }, { passive: true });

    // Buttons
    this.prevButton.addEventListener('click', () => this.prevPage());
    this.nextButton.addEventListener('click', () => this.nextPage());

    this.playPauseButton.addEventListener('click', () => this.togglePlayPause());

    document.getElementById('btn-replay-narration')?.addEventListener('click', () => {
      this.replayCurrentNarration();
    });

    document.getElementById('btn-mute-narration')?.addEventListener('click', () => {
      const isMuted = this.audioController.toggleNarrationMute();
      const icon = document.getElementById('icon-voice-on');
      if (icon) {
        icon.classList.toggle('text-red-400', isMuted);
      }
    });

    this.ambientToggleButton.addEventListener('click', () => {
      const isMuted = this.audioController.toggleAmbientMute();
      this.ambientToggleButton.classList.toggle('text-red-400', isMuted);
      this.ambientToggleButton.classList.toggle('text-white', !isMuted);
    });

    this.autoTurnButton.addEventListener('click', () => {
      this.autoTurnPages = !this.autoTurnPages;
      this.autoTurnButton.className = `p-2 sm:px-3 sm:py-1.5 rounded-xl border transition backdrop-blur-md text-xs font-medium flex items-center gap-1.5 ${
        this.autoTurnPages ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/10 border-white/15 text-slate-400'
      }`;
    });

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const lang = (e.currentTarget as HTMLElement).getAttribute('data-lang') as SupportedLanguage;
        if (lang) this.setLanguage(lang);
      });
    });

    // Fullscreen toggle
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Chapter Drawer
    document.getElementById('btn-drawer')?.addEventListener('click', () => {
      this.toggleChapterDrawer(true);
    });
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      this.toggleChapterDrawer(false);
    });

    // Start overlay (unlocks Web Audio autoplay)
    document.getElementById('btn-start-reading')?.addEventListener('click', () => {
      const overlay = document.getElementById('start-overlay');
      if (overlay) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.remove(), 400);
      }
      this.isUserInteracted = true;
      this.playCurrentSceneAudio();
    });
  }

  private onResize() {
    if (!this.stageWrapper || !this.sceneFrame) return;

    const mainEl = this.stageWrapper.parentElement;
    if (!mainEl) return;

    const availableWidth = mainEl.clientWidth - 16;
    const availableHeight = mainEl.clientHeight - 16;

    const baseW = 1024;
    const baseH = 768;

    const scale = Math.min(availableWidth / baseW, availableHeight / baseH, 1.4);

    const actualW = Math.round(baseW * scale);
    const actualH = Math.round(baseH * scale);

    this.stageWrapper.style.width = `${actualW}px`;
    this.stageWrapper.style.height = `${actualH}px`;

    this.sceneFrame.style.transform = `scale(${scale})`;
    this.sceneFrame.style.transformOrigin = 'top left';
  }

  public goToScene(index: number, playAudio = true) {
    if (!this.manifest || index < 0 || index >= this.manifest.totalScenes) return;

    this.clearAutoTurnTimer();
    this.currentSceneIndex = index;
    localStorage.setItem('mousekin_last_scene', index.toString());

    const scene = this.manifest.scenes[index];

    // Page flip transition animation
    this.stageWrapper.classList.add('scale-[0.98]', 'opacity-90');
    setTimeout(() => {
      this.stageWrapper.classList.remove('scale-[0.98]', 'opacity-90');
    }, 200);

    // Update Progress Indicator
    this.progressIndicator.textContent = `${scene.titles[this.currentLang] || `Глава ${index}`} (${index + 1}/${this.manifest.totalScenes})`;

    // Prev / Next button states
    this.prevButton.disabled = index === 0;
    this.nextButton.disabled = index === this.manifest.totalScenes - 1;

    // Update Background image
    const bgUrl = this.resolveUrl(scene.bgImage);
    this.bgLayer.src = bgUrl;
    this.ambientBackdrop.style.backgroundImage = `url('${bgUrl}')`;

    // Render Overlays & Touch Triggers
    this.renderOverlays(scene);

    // Render Subtitles Text
    this.renderSubtitles(scene);

    // Play Audio if user has already unlocked it
    if (this.isUserInteracted && playAudio) {
      this.playCurrentSceneAudio();
    }

    // Briefly show touch hint on early scenes
    const hint = document.getElementById('touch-hint');
    if (hint && index <= 3 && scene.touchTriggers.length > 0) {
      hint.classList.remove('opacity-0');
      setTimeout(() => hint.classList.add('opacity-0'), 3500);
    }

    // Highlight current chapter in drawer
    this.updateDrawerActiveItem();
  }

  private playCurrentSceneAudio() {
    if (!this.manifest) return;
    const scene = this.manifest.scenes[this.currentSceneIndex];
    const langContent = scene.languages[this.currentLang];

    // 1. Play Narration
    if (langContent && langContent.audio) {
      this.audioController.playNarration(langContent.audio, langContent.words);
    } else {
      this.audioController.pauseNarration();
    }

    // 2. Play Ambient Soundtrack
    if (scene.ambientAudio) {
      this.audioController.playAmbient(scene.ambientAudio);
    } else {
      this.audioController.stopAmbient();
    }
  }

  private renderOverlays(scene: BookScene) {
    this.overlaysLayer.innerHTML = '';

    scene.overlays.forEach((overlay) => {
      if (overlay.lang && overlay.lang !== this.currentLang) {
        return;
      }

      const div = document.createElement('div');
      div.id = overlay.id;
      div.className = `absolute select-none pointer-events-auto transition-transform ${overlay.classes.join(' ')}`;
      div.setAttribute('style', overlay.style);

      const trigger = scene.touchTriggers.find(t => 
        (t.lang === null || t.lang === this.currentLang) &&
        (t.targetObject === overlay.id || 
         (overlay.id.includes('button') && t.targetObject.includes('button')) ||
         overlay.id.toLowerCase().includes(t.targetObject.toLowerCase()) ||
         t.targetObject.toLowerCase().includes(overlay.id.toLowerCase()))
      );

      if (trigger) {
        div.style.cursor = 'pointer';
        div.classList.add('hover:scale-105', 'active:scale-95', 'transition-transform');
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleObjectTouch(div, trigger, e);
        });
      }

      if (overlay.img) {
        const img = document.createElement('img');
        img.src = this.resolveUrl(overlay.img);
        img.alt = '';
        img.className = 'w-full h-full object-contain pointer-events-none';
        div.appendChild(img);
      }

      this.overlaysLayer.appendChild(div);
    });
  }

  private handleObjectTouch(element: HTMLElement, trigger: { sound: string | null; targetObject: string }, event?: MouseEvent) {
    if (trigger.sound) {
      this.audioController.playSFX(trigger.sound);
    }

    element.animate([
      { transform: `${element.style.transform || ''} scale(1)` },
      { transform: `${element.style.transform || ''} scale(1.15) rotate(4deg)` },
      { transform: `${element.style.transform || ''} scale(0.95) rotate(-3deg)` },
      { transform: `${element.style.transform || ''} scale(1.05) rotate(2deg)` },
      { transform: `${element.style.transform || ''} scale(1)` }
    ], {
      duration: 500,
      easing: 'ease-out'
    });

    if (event) {
      this.spawnTouchSparkle(event.clientX, event.clientY);
    }
  }

  private spawnTouchSparkle(x: number, y: number) {
    const star = document.createElement('div');
    star.className = 'fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 text-amber-300 text-2xl select-none';
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.innerHTML = '✨';
    document.body.appendChild(star);
    star.animate([
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
      { transform: 'translate(-50%, -70px) scale(1.4)', opacity: 0 }
    ], { duration: 600, easing: 'ease-out' }).onfinish = () => star.remove();
  }

  private toggleSubtitles(forceState?: boolean) {
    this.isSubtitlesVisible = forceState !== undefined ? forceState : !this.isSubtitlesVisible;
    if (this.subtitlesPanel) {
      if (this.isSubtitlesVisible) {
        this.subtitlesPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4', 'max-h-0', 'h-0', 'p-0', 'border-transparent');
        this.subtitlesPanel.classList.add('h-[56px]', 'sm:h-[64px]', 'opacity-100');
        this.toggleSubtitlesButton?.classList.add('bg-amber-500/20', 'border-amber-400/50', 'text-amber-300');
        this.toggleSubtitlesButton?.classList.remove('bg-white/10', 'border-white/15', 'text-slate-400');
      } else {
        this.subtitlesPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4', 'max-h-0', 'h-0', 'p-0', 'border-transparent');
        this.subtitlesPanel.classList.remove('h-[56px]', 'sm:h-[64px]', 'opacity-100');
        this.toggleSubtitlesButton?.classList.remove('bg-amber-500/20', 'border-amber-400/50', 'text-amber-300');
        this.toggleSubtitlesButton?.classList.add('bg-white/10', 'border-white/15', 'text-slate-400');
      }
    }
  }

  private renderSubtitles(scene: BookScene) {
    const langContent = scene.languages[this.currentLang];
    
    // Reset viewport scroll position to top
    if (this.subtitlesViewport) {
      this.subtitlesViewport.scrollTop = 0;
    }

    if (!langContent || !langContent.fullText) {
      this.textContainer.innerHTML = `<span class="text-amber-300 font-bold">${scene.titles[this.currentLang]}</span>`;
      return;
    }

    if (langContent.words && langContent.words.length > 0) {
      this.textContainer.innerHTML = langContent.words.map(w => {
        return `<span id="word-${w.id}" class="inline-block transition-all duration-150 rounded px-1">${w.text}</span>`;
      }).join(' ');
    } else {
      this.textContainer.textContent = langContent.fullText;
    }
  }

  private highlightWord(wordId: string | null) {
    const prev = this.textContainer.querySelectorAll('.word-highlight');
    prev.forEach(el => el.classList.remove('word-highlight', 'text-amber-300', 'font-extrabold', 'scale-105', 'bg-amber-400/20'));

    if (wordId) {
      const el = document.getElementById(`word-${wordId}`);
      if (el) {
        el.classList.add('word-highlight', 'text-amber-300', 'font-extrabold', 'scale-105', 'bg-amber-400/20');

        // Smooth Teleprompter Auto-Scroll: keep current word vertically centered in the 60px/68px strip
        if (this.subtitlesViewport) {
          const wordOffsetTop = el.offsetTop;
          const viewportH = this.subtitlesViewport.clientHeight;
          const targetScroll = Math.max(0, wordOffsetTop - (viewportH / 2) + (el.clientHeight / 2));
          this.subtitlesViewport.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }
  }

  private togglePlayPause() {
    if (!this.isUserInteracted) {
      this.isUserInteracted = true;
      document.getElementById('start-overlay')?.remove();
      this.playCurrentSceneAudio();
      return;
    }

    this.clearAutoTurnTimer();

    if (this.audioController.isNarrationPlaying()) {
      this.audioController.pauseNarration();
    } else {
      const scene = this.manifest?.scenes[this.currentSceneIndex];
      const langContent = scene?.languages[this.currentLang];
      if (langContent?.audio) {
        this.audioController.resumeNarration();
      } else {
        this.playCurrentSceneAudio();
      }
    }
  }

  private replayCurrentNarration() {
    this.clearAutoTurnTimer();
    if (!this.manifest) return;
    const scene = this.manifest.scenes[this.currentSceneIndex];
    const langContent = scene.languages[this.currentLang];
    if (langContent && langContent.audio) {
      this.audioController.playNarration(langContent.audio, langContent.words);
    }
  }

  private updatePlayPauseIcon(isPlaying: boolean) {
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    if (iconPlay && iconPause) {
      iconPlay.classList.toggle('hidden', isPlaying);
      iconPause.classList.toggle('hidden', !isPlaying);
    }
  }

  public setLanguage(lang: SupportedLanguage) {
    if (this.currentLang === lang) return;
    this.currentLang = lang;

    document.querySelectorAll('.lang-btn').forEach(btn => {
      const bLang = btn.getAttribute('data-lang');
      if (bLang === lang) {
        btn.className = 'lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow';
      } else {
        btn.className = 'lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition text-slate-300 hover:text-white';
      }
    });

    this.goToScene(this.currentSceneIndex, true);
    this.renderChapterDrawer();
  }

  public nextPage() {
    this.clearAutoTurnTimer();
    if (this.manifest && this.currentSceneIndex < this.manifest.totalScenes - 1) {
      this.goToScene(this.currentSceneIndex + 1);
    }
  }

  public prevPage() {
    this.clearAutoTurnTimer();
    if (this.currentSceneIndex > 0) {
      this.goToScene(this.currentSceneIndex - 1);
    }
  }

  private renderChapterDrawer() {
    if (!this.manifest) return;
    const drawerItems = document.getElementById('drawer-items');
    if (!drawerItems) return;

    drawerItems.innerHTML = '';
    this.manifest.scenes.forEach((scene, idx) => {
      const item = document.createElement('div');
      item.id = `drawer-item-${idx}`;
      item.className = `p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
        idx === this.currentSceneIndex 
          ? 'bg-amber-500/25 border-amber-400 text-amber-200' 
          : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
      }`;

      const thumbUrl = this.resolveUrl(scene.thumbnail[this.currentLang] || scene.thumbnail['RU']);
      item.innerHTML = `
        <img src="${thumbUrl}" alt="Thumb" class="w-14 h-11 object-cover rounded-lg border border-white/15 bg-black" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-amber-400 font-semibold">Глава ${idx}</p>
          <p class="text-sm font-medium truncate">${scene.titles[this.currentLang] || `Глава ${idx}`}</p>
        </div>
      `;

      item.addEventListener('click', () => {
        this.goToScene(idx);
        this.toggleChapterDrawer(false);
      });

      drawerItems.appendChild(item);
    });
  }

  private updateDrawerActiveItem() {
    if (!this.manifest) return;
    this.manifest.scenes.forEach((_, idx) => {
      const item = document.getElementById(`drawer-item-${idx}`);
      if (item) {
        if (idx === this.currentSceneIndex) {
          item.className = 'p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition bg-amber-500/25 border-amber-400 text-amber-200 shadow-md';
        } else {
          item.className = 'p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition bg-white/5 border-white/10 hover:bg-white/10 text-slate-200';
        }
      }
    });
  }

  private toggleChapterDrawer(open: boolean) {
    this.isChapterDrawerOpen = open;
    if (open) {
      this.drawerElement.classList.remove('-translate-x-full');
    } else {
      this.drawerElement.classList.add('-translate-x-full');
    }
  }
}
