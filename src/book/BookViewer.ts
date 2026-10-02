import { BookManifest, BookScene, SupportedLanguage } from './types';
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
  private runningAnimations: Animation[] = [];

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

  // Media recording state
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordedAudioUrl: string | null = null;
  private userRecordings: Record<number, string> = {}; // sceneIndex -> audioUrl

  // Doodle state
  private isDoodleOpen = false;
  private doodleCanvas: HTMLCanvasElement | null = null;
  private doodleCtx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private currentColor = '#d97706';
  private currentLineWidth = 6;
  private isEraser = false;

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

        <!-- AUTHENTIC TOP TOOLBAR (Matching TigerCreate HUD) -->
        <header class="relative z-30 w-full px-2 sm:px-6 py-1.5 sm:py-2.5 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-sm">
          <!-- Left side: Chapter Drawer Button & Title -->
          <div class="flex items-center gap-1.5 sm:gap-3">
            <!-- 🗂️ CHAPTERS SELECTOR (Icon 1) -->
            <button id="btn-drawer" title="Содержание сказки (Главы)" class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-1.5 text-xs sm:text-sm font-medium transition backdrop-blur-md active:scale-95">
              <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <span class="hidden sm:inline font-semibold">Главы</span>
            </button>

            <!-- 💬 SUBTITLES TOGGLE (Icon 2) -->
            <button id="btn-subtitles-top" title="Показать/скрыть текст" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition backdrop-blur-md active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>

            <!-- 🔊 SOUND MUTE/UNMUTE (Icon 3) -->
            <button id="btn-sound-toggle" title="Звук и фоновая музыка" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md active:scale-95">
              <svg id="icon-sound-state" class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>

            <!-- 💡 INTERACTIVE HOTSPOTS HINT (Icon 4) -->
            <button id="btn-hint" title="Подсказка: показать всё интерактивное" class="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 transition backdrop-blur-md active:scale-95 flex items-center gap-1">
              <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span class="hidden md:inline text-xs font-bold text-amber-200">Подсказка</span>
            </button>

            <!-- 🎤 MICROPHONE RECORDING (Icon 5) -->
            <button id="btn-mic" title="Записать свой голос" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white hover:text-amber-300 transition backdrop-blur-md active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            <!-- 🖌️ DOODLE / PAINTING (Icon 6) -->
            <button id="btn-doodle" title="Раскраска и рисование" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white hover:text-amber-300 transition backdrop-blur-md active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <!-- Middle Chapter Title Pill -->
          <div id="progress-indicator" class="hidden lg:block text-xs sm:text-sm font-semibold tracking-wide text-amber-300 bg-black/50 px-3 py-1 rounded-full border border-amber-500/20 backdrop-blur-sm truncate max-w-xs text-center">
            Мышонок в Часовьем городе
          </div>

          <!-- Right side: Language Selector & Auto-turn -->
          <div class="flex items-center gap-1.5 sm:gap-2.5">
            <!-- 🏳️ LANGUAGE SELECTOR (Icon 7) -->
            <div class="bg-black/60 p-0.5 sm:p-1 rounded-xl border border-white/15 flex items-center gap-0.5 backdrop-blur-md">
              <button data-lang="RU" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'RU' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">RU</button>
              <button data-lang="EN" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'EN' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">EN</button>
              <button data-lang="DE" class="lang-btn px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentLang === 'DE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}">DE</button>
            </div>

            <button id="btn-auto-turn" title="Автоматическое перелистывание" class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border transition backdrop-blur-md text-xs font-medium flex items-center gap-1 ${this.autoTurnPages ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/10 border-white/15 text-slate-400'}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
              <span class="hidden sm:inline">Авто</span>
            </button>

            <button id="btn-fullscreen" title="На весь экран" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            </button>
          </div>
        </header>

        <!-- MAIN BOOK STAGE (1024x768 Container) -->
        <main class="relative z-10 flex-1 w-full flex items-center justify-center px-1 sm:px-4 py-0.5 overflow-hidden">
          <div id="stage-wrapper" class="relative shadow-2xl rounded-2xl overflow-hidden border border-amber-500/20 bg-black/60 transition-transform duration-300">
            <!-- 1024x768 virtual canvas frame -->
            <div id="scene-frame" class="relative w-[1024px] h-[768px] origin-top-left overflow-hidden bg-black select-none">
              <!-- Base background illustration -->
              <img id="scene-bg" src="" alt="Scene" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none" />

              <!-- Overlay Layers & Interactive Characters -->
              <div id="scene-overlays" class="absolute inset-0 w-full h-full"></div>

              <!-- Hotspot hint layer -->
              <div id="hints-overlay" class="absolute inset-0 w-full h-full pointer-events-none z-30"></div>
            </div>
          </div>

          <!-- Navigation Arrow Buttons (Left & Right) -->
          <button id="btn-prev-page" class="absolute left-2 sm:left-6 z-30 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-amber-600/80 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button id="btn-next-page" class="absolute right-2 sm:right-6 z-30 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-amber-600/80 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </button>
        </main>

        <!-- BOTTOM READING STRIP (TELEPROMPTER) & BOTTOM CONTROLS (◀ [ T ] ▶) -->
        <footer id="text-blade" class="relative z-30 w-full px-2 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col items-center">
          
          <!-- SLEEK READING STRIP (Teleprompter auto-scroll, 2 lines, hideable) -->
          <div id="subtitles-panel" class="w-full max-w-3xl h-[52px] sm:h-[62px] relative rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-xl px-3 sm:px-5 flex items-center justify-between overflow-hidden transition-all duration-300">
            <div id="subtitles-viewport" class="flex-1 h-full overflow-y-hidden select-none py-1 text-center" style="-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);">
              <p id="subtitles-container" class="text-sm sm:text-lg md:text-xl text-slate-100 font-sans leading-relaxed tracking-wide transition-all">
                <span class="text-amber-200/80 italic">Мышонок в Часовьем городе...</span>
              </p>
            </div>
            <button id="btn-close-subtitles" title="Скрыть субтитры" class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 transition ml-2 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Quick Bottom Navigation Bar: [ ◀ ] [ T ] [ ▶ ] + Play/Pause -->
          <div class="mt-1.5 flex items-center gap-3 sm:gap-5">
            <!-- [ ◀ ] Previous Scene -->
            <button id="btn-nav-prev" title="Предыдущая страница" class="p-2 rounded-xl text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition backdrop-blur-md active:scale-95 disabled:opacity-30">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>

            <!-- [ T ] BUTTON: Toggle Subtitles On/Off -->
            <button id="btn-toggle-subtitles" title="Показать/скрыть субтитры (Т)" class="w-10 h-10 rounded-xl border text-sm font-black flex items-center justify-center transition backdrop-blur-md bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-lg active:scale-95">
              <span class="font-serif text-base">Т</span>
            </button>

            <!-- Play / Pause Voice Narration -->
            <button id="btn-play-pause" title="Воспроизвести / Пауза" class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/30 transform hover:scale-105 active:scale-95 transition">
              <svg id="icon-play" class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg id="icon-pause" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>

            <!-- Replay Narration -->
            <button id="btn-replay-narration" title="Повторить озвучку сцены" class="p-2 text-slate-400 hover:text-white transition rounded-xl bg-white/5 hover:bg-white/15">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>

            <!-- [ ▶ ] Next Scene -->
            <button id="btn-nav-next" title="Следующая страница" class="p-2 rounded-xl text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition backdrop-blur-md active:scale-95 disabled:opacity-30">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </footer>

        <!-- CHAPTERS SLIDE-OVER DRAWER -->
        <aside id="chapter-drawer" class="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-[#120f24]/95 backdrop-blur-2xl border-r border-amber-500/20 shadow-2xl transform -translate-x-full transition-transform duration-300 flex flex-col">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 class="text-lg font-bold text-amber-300 flex items-center gap-2">
              <span>Содержание сказки</span>
            </h3>
            <button id="btn-close-drawer" class="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="drawer-items" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
        </aside>

        <!-- DOODLE / COLORING MODAL -->
        <div id="doodle-modal" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md hidden flex-col items-center justify-center p-2 sm:p-4">
          <div class="relative w-full max-w-4xl bg-[#17132a] border border-amber-500/30 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col items-center">
            <div class="w-full flex items-center justify-between mb-3 px-2">
              <h3 class="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
                <span>🎨 Раскраска и рисование</span>
              </h3>
              <div class="flex items-center gap-2">
                <button id="btn-clear-doodle" class="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 rounded-xl text-xs font-semibold">Очистить</button>
                <button id="btn-close-doodle" class="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Canvas Container -->
            <div class="relative w-full aspect-[4/3] max-h-[65vh] bg-cover bg-center rounded-2xl overflow-hidden border border-white/20 shadow-inner" style="background-image: url('${this.resolveUrl('doodle/background.png')}');">
              <canvas id="doodle-canvas" width="1024" height="768" class="w-full h-full cursor-crosshair touch-none"></canvas>
            </div>

            <!-- Drawing Tools Toolbar -->
            <div class="w-full mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-2">
              <!-- Colors -->
              <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                ${['#d97706', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ffffff', '#18181b'].map(c => `
                  <button data-color="${c}" class="color-btn w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition ${c === '#d97706' ? 'border-amber-300 scale-110 shadow' : 'border-white/30 hover:scale-105'}" style="background-color: ${c};"></button>
                `).join('')}
              </div>

              <!-- Brush sizes -->
              <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button data-size="3" class="size-btn px-2 py-1 text-xs text-slate-300 hover:text-white rounded-lg">Тонкая</button>
                <button data-size="8" class="size-btn px-2 py-1 text-xs text-amber-300 font-bold bg-white/10 rounded-lg">Средняя</button>
                <button data-size="16" class="size-btn px-2 py-1 text-xs text-slate-300 hover:text-white rounded-lg">Широкая</button>
              </div>

              <!-- Eraser toggle -->
              <button id="btn-doodle-eraser" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/20 bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5">
                <span>Ластик</span>
              </button>
            </div>
          </div>
        </div>

        <!-- VOICE RECORDER MODAL -->
        <div id="mic-modal" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md hidden flex-col items-center justify-center p-4">
          <div class="relative w-full max-w-md bg-[#17132a] border border-amber-500/30 rounded-3xl p-6 text-center shadow-2xl">
            <h3 class="text-xl font-bold text-amber-300 mb-2 font-serif">Запись своей озвучки</h3>
            <p class="text-xs text-slate-300 mb-6">Вы можете записать чтение сказки своим голосом для текущей главы!</p>
            
            <div class="flex items-center justify-center gap-4 mb-6">
              <button id="btn-record-toggle" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition active:scale-95">
                <span id="record-state-icon" class="w-6 h-6 rounded-full bg-white"></span>
              </button>
              <button id="btn-play-recorded" disabled class="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-bold flex items-center justify-center shadow-lg transition active:scale-95">
                <svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>

            <p id="record-status-txt" class="text-sm font-medium text-slate-400 mb-6">Нажмите красную кнопку для старта записи</p>

            <button id="btn-close-mic" class="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition border border-white/15">Закрыть</button>
          </div>
        </div>

        <!-- Initial Start Modal overlay for sound autoplay permission -->
        <div id="start-overlay" class="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div class="max-w-md w-full bg-[#18132e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl"></div>
            <img id="cover-img" src="" alt="Cover" class="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 border border-amber-500/40 shadow-xl" />
            <h1 class="text-2xl sm:text-3xl font-extrabold text-amber-300 mb-2 font-serif">Мышонок в Часовьем городе</h1>
            <p class="text-xs sm:text-sm text-slate-300 mb-6">Оригинальная интерактивная сказка с живой анимацией, интерактивными персонажами, озвучкой и музыкой.</p>
            <button id="btn-start-reading" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-lg shadow-xl shadow-amber-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>Открыть сказку</span>
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
    this.ambientToggleButton = document.getElementById('btn-sound-toggle') as HTMLButtonElement;
    this.autoTurnButton = document.getElementById('btn-auto-turn') as HTMLButtonElement;
    this.drawerElement = document.getElementById('chapter-drawer')!;
    this.subtitlesPanel = document.getElementById('subtitles-panel')!;
    this.toggleSubtitlesButton = document.getElementById('btn-toggle-subtitles') as HTMLButtonElement;

    // Subtitle toggles
    this.toggleSubtitlesButton?.addEventListener('click', () => {
      this.toggleSubtitles();
    });

    document.getElementById('btn-subtitles-top')?.addEventListener('click', () => {
      this.toggleSubtitles();
    });

    document.getElementById('btn-close-subtitles')?.addEventListener('click', () => {
      this.toggleSubtitles(false);
    });

    const coverImg = document.getElementById('cover-img') as HTMLImageElement;
    if (coverImg) {
      coverImg.src = this.resolveUrl('images/Cover_4B38A2B5-F5D2-4DB4-BD47-54C063EE51AB_iBooks.jpg');
    }

    this.initDoodleCanvas();
    this.initMicRecorder();
    this.onResize();
  }

  private bindGlobalEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (this.isDoodleOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.prevPage();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.togglePlayPause();
      }
    });

    // Touch gestures for swipe navigation
    const viewer = document.getElementById('book-viewer')!;
    viewer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        if (target.closest('#chapter-drawer') || target.closest('#doodle-modal') || target.closest('#mic-modal') || target.closest('button')) {
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

      // Horizontal swipe to turn pages
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
    document.getElementById('btn-nav-prev')?.addEventListener('click', () => this.prevPage());
    document.getElementById('btn-nav-next')?.addEventListener('click', () => this.nextPage());

    this.playPauseButton.addEventListener('click', () => this.togglePlayPause());

    document.getElementById('btn-replay-narration')?.addEventListener('click', () => {
      this.replayCurrentNarration();
    });

    // Sound toggle button (mutes both narration and ambient music)
    this.ambientToggleButton.addEventListener('click', () => {
      const isMuted = this.audioController.toggleAmbientMute();
      this.audioController.toggleNarrationMute();
      const icon = document.getElementById('icon-sound-state');
      if (icon) {
        icon.classList.toggle('text-red-400', isMuted);
        icon.classList.toggle('text-amber-300', !isMuted);
      }
    });

    // Auto-turn button
    this.autoTurnButton.addEventListener('click', () => {
      this.autoTurnPages = !this.autoTurnPages;
      this.autoTurnButton.className = `p-2 sm:px-2.5 sm:py-1.5 rounded-xl border transition backdrop-blur-md text-xs font-medium flex items-center gap-1 ${
        this.autoTurnPages ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/10 border-white/15 text-slate-400'
      }`;
    });

    // Interactive Hint button (💡)
    document.getElementById('btn-hint')?.addEventListener('click', () => {
      this.triggerInteractiveHints();
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

    // Doodle Modal Open/Close
    document.getElementById('btn-doodle')?.addEventListener('click', () => {
      this.openDoodleModal();
    });
    document.getElementById('btn-close-doodle')?.addEventListener('click', () => {
      this.closeDoodleModal();
    });

    // Mic Modal Open/Close
    document.getElementById('btn-mic')?.addEventListener('click', () => {
      this.openMicModal();
    });
    document.getElementById('btn-close-mic')?.addEventListener('click', () => {
      this.closeMicModal();
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

    // Page flip subtle bounce
    this.stageWrapper.classList.add('scale-[0.98]', 'opacity-90');
    setTimeout(() => {
      this.stageWrapper.classList.remove('scale-[0.98]', 'opacity-90');
    }, 200);

    // Update Progress Indicator & Titles
    this.progressIndicator.textContent = `${scene.titles[this.currentLang] || `Глава ${index}`} (${index + 1}/${this.manifest.totalScenes})`;

    // Navigation buttons state
    const isFirst = index === 0;
    const isLast = index === this.manifest.totalScenes - 1;
    this.prevButton.disabled = isFirst;
    this.nextButton.disabled = isLast;
    const btnNavPrev = document.getElementById('btn-nav-prev') as HTMLButtonElement;
    const btnNavNext = document.getElementById('btn-nav-next') as HTMLButtonElement;
    if (btnNavPrev) btnNavPrev.disabled = isFirst;
    if (btnNavNext) btnNavNext.disabled = isLast;

    // Update Background image
    const bgUrl = this.resolveUrl(scene.bgImage);
    this.bgLayer.src = bgUrl;
    this.ambientBackdrop.style.backgroundImage = `url('${bgUrl}')`;

    // Render Overlays, Start Animations & Touch Handlers
    this.renderOverlays(scene);

    // Render Subtitles Text
    this.renderSubtitles(scene);

    // Play Audio
    if (this.isUserInteracted && playAudio) {
      this.playCurrentSceneAudio();
    }

    // Highlight current chapter in drawer
    this.updateDrawerActiveItem();
  }

  private playCurrentSceneAudio() {
    if (!this.manifest) return;

    // If user has a custom voice recording for this scene, play it!
    const customRec = this.userRecordings[this.currentSceneIndex];
    if (customRec) {
      const audio = new Audio(customRec);
      audio.play().catch(() => {});
      return;
    }

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
    // 1. Stop and cancel all previously running Web Animations
    this.runningAnimations.forEach(anim => {
      try { anim.cancel(); } catch { /* ignore */ }
    });
    this.runningAnimations = [];

    this.overlaysLayer.innerHTML = '';
    const hintsOverlay = document.getElementById('hints-overlay');
    if (hintsOverlay) hintsOverlay.innerHTML = '';

    const touchActions = scene.touchActions || {};
    const touchAnimations = scene.touchAnimations || {};

    // 2. Create overlay DOM elements
    scene.overlays.forEach((overlay) => {
      if (overlay.lang && overlay.lang !== this.currentLang) {
        return;
      }

      const div = document.createElement('div');
      div.id = overlay.id;
      div.className = `absolute select-none pointer-events-auto ${overlay.classes.join(' ')}`;
      div.setAttribute('style', overlay.style);

      if (overlay.img) {
        const img = document.createElement('img');
        img.src = this.resolveUrl(overlay.img);
        img.alt = '';
        img.className = 'w-full h-full object-contain pointer-events-none';
        div.appendChild(img);
      }

      // Check if this overlay has an interactive touch action
      let action = touchActions[overlay.id];
      if (!action) {
        // Try finding matching action by sub-string
        for (const [k, act] of Object.entries(touchActions)) {
          if (overlay.id.includes(k) || k.includes(overlay.id)) {
            action = act;
            break;
          }
        }
      }

      if (action) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerTouchAction(action!, touchAnimations, e.clientX, e.clientY);
        });
      }

      this.overlaysLayer.appendChild(div);
    });

    // 3. Play Start Animations using native Web Animations API
    if (scene.startAnimations && scene.startAnimations.length > 0) {
      scene.startAnimations.forEach((anim) => {
        if (anim.lang && anim.lang !== this.currentLang) {
          return;
        }

        anim.tracks.forEach((track) => {
          const targetEl = document.getElementById(track.targetId);
          if (targetEl && track.keyframes && track.keyframes.length > 0) {
            const webKeyframes = track.keyframes.map(kf => ({
              offset: kf.offset,
              transform: kf.transform,
              opacity: kf.opacity
            }));

            const wa = targetEl.animate(webKeyframes, {
              duration: track.durationMs > 0 ? track.durationMs : 100,
              iterations: anim.repeat === 0 ? Infinity : 1,
              fill: 'forwards',
              easing: 'linear'
            });
            this.runningAnimations.push(wa);
          }
        });
      });
    }
  }

  private triggerTouchAction(
    action: { animationIds: string[]; sound: string | null },
    touchAnimations: Record<string, { repeat: number; tracks: Array<{ targetId: string; durationMs: number; keyframes: Array<{ offset: number; transform: string; opacity: number }> }> }>,
    clientX?: number,
    clientY?: number
  ) {
    // 1. Play SFX
    if (action.sound) {
      this.audioController.playSFX(action.sound);
    }

    // 2. Play animations
    if (action.animationIds && action.animationIds.length > 0) {
      action.animationIds.forEach((aid) => {
        const animDef = touchAnimations[aid];
        if (animDef && animDef.tracks) {
          animDef.tracks.forEach((track) => {
            const targetEl = document.getElementById(track.targetId);
            if (targetEl && track.keyframes.length > 0) {
              const wa = targetEl.animate(track.keyframes, {
                duration: track.durationMs > 0 ? track.durationMs : 250,
                iterations: animDef.repeat === 0 ? Infinity : 1,
                fill: 'forwards',
                easing: 'ease-in-out'
              });
              this.runningAnimations.push(wa);
            }
          });
        }
      });
    }

    // 3. Touch visual sparkle
    if (clientX !== undefined && clientY !== undefined) {
      this.spawnTouchSparkle(clientX, clientY);
    }
  }

  public triggerInteractiveHints() {
    if (!this.manifest) return;
    const scene = this.manifest.scenes[this.currentSceneIndex];
    const hintsOverlay = document.getElementById('hints-overlay');
    if (!hintsOverlay) return;

    hintsOverlay.innerHTML = '';
    const touchActions = scene.touchActions || {};
    const targetIds = Object.keys(touchActions);

    if (targetIds.length === 0) {
      this.spawnToast('На этой сцене нет дополнительных скрытых кнопок');
      return;
    }

    targetIds.forEach((tid) => {
      const el = document.getElementById(tid);
      if (el) {
        const rect = el.getBoundingClientRect();
        const stageRect = this.sceneFrame.getBoundingClientRect();
        const scale = stageRect.width / 1024;

        const leftPx = (rect.left - stageRect.left) / scale + (rect.width / scale) / 2;
        const topPx = (rect.top - stageRect.top) / scale + (rect.height / scale) / 2;

        const marker = document.createElement('div');
        marker.className = 'absolute transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none select-none flex items-center justify-center';
        marker.style.left = `${leftPx}px`;
        marker.style.top = `${topPx}px`;

        marker.innerHTML = `
          <div class="relative w-12 h-12 flex items-center justify-center">
            <span class="absolute inset-0 rounded-full bg-amber-400/40 animate-ping"></span>
            <img src="${this.resolveUrl('reader/Hint_4B38A2B5-F5D2-4DB4-BD47-54C063EE51AB.png')}" class="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-bounce" alt="hint" />
          </div>
        `;

        hintsOverlay.appendChild(marker);
      }
    });

    // Auto-hide hint markers after 3.5 seconds
    setTimeout(() => {
      if (hintsOverlay) hintsOverlay.innerHTML = '';
    }, 3500);
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

  private spawnToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 border border-amber-400/50 text-amber-200 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private toggleSubtitles(forceState?: boolean) {
    this.isSubtitlesVisible = forceState !== undefined ? forceState : !this.isSubtitlesVisible;
    if (this.subtitlesPanel) {
      if (this.isSubtitlesVisible) {
        this.subtitlesPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4', 'max-h-0', 'h-0', 'p-0', 'border-transparent');
        this.subtitlesPanel.classList.add('h-[52px]', 'sm:h-[62px]', 'opacity-100');
        this.toggleSubtitlesButton?.classList.add('bg-amber-500/20', 'border-amber-400/50', 'text-amber-300');
        this.toggleSubtitlesButton?.classList.remove('bg-white/10', 'border-white/15', 'text-slate-400');
      } else {
        this.subtitlesPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4', 'max-h-0', 'h-0', 'p-0', 'border-transparent');
        this.subtitlesPanel.classList.remove('h-[52px]', 'sm:h-[62px]', 'opacity-100');
        this.toggleSubtitlesButton?.classList.remove('bg-amber-500/20', 'border-amber-400/50', 'text-amber-300');
        this.toggleSubtitlesButton?.classList.add('bg-white/10', 'border-white/15', 'text-slate-400');
      }
    }
  }

  private renderSubtitles(scene: BookScene) {
    const langContent = scene.languages[this.currentLang];
    
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

        // Smooth Teleprompter auto-scroll: keeps word centered in the viewing strip
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

  // --- DOODLE CANVAS / COLORING TOOL ---
  private initDoodleCanvas() {
    const canvas = document.getElementById('doodle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    this.doodleCanvas = canvas;
    this.doodleCtx = canvas.getContext('2d');

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const startDraw = (pos: { x: number; y: number }) => {
      if (!this.doodleCtx) return;
      this.isDrawing = true;
      this.doodleCtx.beginPath();
      this.doodleCtx.moveTo(pos.x, pos.y);
      this.doodleCtx.lineCap = 'round';
      this.doodleCtx.lineJoin = 'round';
      this.doodleCtx.lineWidth = this.currentLineWidth;
      this.doodleCtx.strokeStyle = this.isEraser ? '#ffffff' : this.currentColor;
      this.doodleCtx.globalCompositeOperation = this.isEraser ? 'destination-out' : 'source-over';
    };

    const draw = (pos: { x: number; y: number }) => {
      if (!this.isDrawing || !this.doodleCtx) return;
      this.doodleCtx.lineTo(pos.x, pos.y);
      this.doodleCtx.stroke();
    };

    const endDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', (e) => startDraw(getPos(e)));
    canvas.addEventListener('mousemove', (e) => draw(getPos(e)));
    window.addEventListener('mouseup', () => endDraw());

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDraw(getPos(e.touches[0]));
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        draw(getPos(e.touches[0]));
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => endDraw());

    // Color pickers
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const c = (e.currentTarget as HTMLElement).getAttribute('data-color');
        if (c) {
          this.currentColor = c;
          this.isEraser = false;
          document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('scale-110', 'border-amber-300'));
          (e.currentTarget as HTMLElement).classList.add('scale-110', 'border-amber-300');
          document.getElementById('btn-doodle-eraser')?.classList.remove('bg-amber-500/20', 'border-amber-400');
        }
      });
    });

    // Size pickers
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const s = (e.currentTarget as HTMLElement).getAttribute('data-size');
        if (s) {
          this.currentLineWidth = parseInt(s, 10);
          document.querySelectorAll('.size-btn').forEach(b => b.className = 'size-btn px-2 py-1 text-xs text-slate-300 hover:text-white rounded-lg');
          (e.currentTarget as HTMLElement).className = 'size-btn px-2 py-1 text-xs text-amber-300 font-bold bg-white/10 rounded-lg';
        }
      });
    });

    // Eraser
    document.getElementById('btn-doodle-eraser')?.addEventListener('click', (e) => {
      this.isEraser = !this.isEraser;
      (e.currentTarget as HTMLElement).classList.toggle('bg-amber-500/20', this.isEraser);
      (e.currentTarget as HTMLElement).classList.toggle('border-amber-400', this.isEraser);
    });

    // Clear
    document.getElementById('btn-clear-doodle')?.addEventListener('click', () => {
      if (this.doodleCtx && this.doodleCanvas) {
        this.doodleCtx.clearRect(0, 0, this.doodleCanvas.width, this.doodleCanvas.height);
      }
    });
  }

  private openDoodleModal() {
    this.isDoodleOpen = true;
    const modal = document.getElementById('doodle-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  private closeDoodleModal() {
    this.isDoodleOpen = false;
    const modal = document.getElementById('doodle-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // --- VOICE RECORDER ---
  private initMicRecorder() {
    const recordBtn = document.getElementById('btn-record-toggle');
    const playBtn = document.getElementById('btn-play-recorded') as HTMLButtonElement;
    const statusTxt = document.getElementById('record-status-txt');

    recordBtn?.addEventListener('click', async () => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        if (statusTxt) statusTxt.textContent = 'Запись сохранена! Нажмите плей для прослушивания.';
        recordBtn.className = 'w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition active:scale-95';
        document.getElementById('record-state-icon')?.classList.replace('rounded-none', 'rounded-full');
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
          };
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            this.recordedAudioUrl = URL.createObjectURL(blob);
            this.userRecordings[this.currentSceneIndex] = this.recordedAudioUrl;
            if (playBtn) playBtn.disabled = false;
          };
          this.mediaRecorder.start();
          if (statusTxt) statusTxt.textContent = 'Идёт запись... Говорите в микрофон!';
          recordBtn.className = 'w-16 h-16 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg animate-pulse transition active:scale-95';
          document.getElementById('record-state-icon')?.classList.replace('rounded-full', 'rounded-none');
        } catch (err) {
          console.error('Mic access error:', err);
          if (statusTxt) statusTxt.textContent = 'Не удалось получить доступ к микрофону';
        }
      }
    });

    playBtn?.addEventListener('click', () => {
      if (this.recordedAudioUrl) {
        const audio = new Audio(this.recordedAudioUrl);
        audio.play().catch(() => {});
      }
    });
  }

  private openMicModal() {
    const modal = document.getElementById('mic-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  private closeMicModal() {
    const modal = document.getElementById('mic-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
}
