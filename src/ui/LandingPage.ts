export class LandingPage {
  private container: HTMLElement;
  private onPlayClick: () => void;
  private deferredPrompt: any = null;

  constructor(container: HTMLElement, onPlayClick: () => void) {
    this.container = container;
    this.onPlayClick = onPlayClick;
    this.setupPWAInstall();
    this.render();
  }

  private setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const pwaBtn = document.getElementById('pwa-install-btn');
      const pwaHeroBtn = document.getElementById('pwa-hero-btn');
      if (pwaBtn) pwaBtn.classList.remove('hidden');
      if (pwaHeroBtn) pwaHeroBtn.classList.remove('hidden');
    });
  }

  private triggerInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        this.deferredPrompt = null;
      });
    } else {
      alert('Чтобы установить сказку на телефон:\n• На Android/Chrome: нажмите меню (три точки) ➔ «Установить приложение»\n• На iPhone/Safari: нажмите «Поделиться» ➔ «На экран «Домой»»');
    }
  }

  public render() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-[#0d0a1a] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
        
        <!-- Navigation Bar -->
        <header class="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0a1a]/80 border-b border-amber-500/20 px-4 md:px-8 py-3.5 transition-all">
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            <a href="#" class="flex items-center gap-3 group">
              <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <img src="/icon-192.png" alt="Мышонок" class="w-full h-full object-cover">
              </div>
              <div class="flex flex-col">
                <span class="font-extrabold text-base md:text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-orange-300">
                  Мышонок в Часовьем городе
                </span>
                <span class="text-[10px] md:text-xs text-amber-200/60 uppercase tracking-widest font-medium">The Little Mouse in Clocktown</span>
              </div>
            </a>

            <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
              <a href="#about" class="hover:text-amber-300 transition-colors">О сказке</a>
              <a href="#characters" class="hover:text-amber-300 transition-colors">Персонажи</a>
              <a href="#features" class="hover:text-amber-300 transition-colors">3D Особенности</a>
              <a href="#download" class="hover:text-amber-300 transition-colors">Скачать</a>
            </nav>

            <div class="flex items-center gap-3">
              <button id="pwa-install-btn" class="hidden text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3 py-1.5 rounded-full font-semibold transition-all">
                📲 Установить PWA
              </button>
              <button id="header-play-btn" class="relative group overflow-hidden rounded-full p-px font-semibold text-xs md:text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-transform">
                <span class="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 animate-pulse"></span>
                <span class="relative px-4 md:px-5 py-2 rounded-full bg-[#150f29] text-amber-200 flex items-center gap-2 group-hover:bg-transparent group-hover:text-black font-bold transition-all">
                  <span>▶</span> <span>Играть в 3D</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 md:px-8 overflow-hidden">
          <!-- Ambient Glows -->
          <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none"></div>
          <div class="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none"></div>

          <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            
            <!-- Left Column: Copy & Actions -->
            <div class="lg:col-span-7 flex flex-col items-start gap-6 text-left">
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
                <span>✨</span>
                <span>Интерактивная 3D Сказка-Приключение</span>
              </div>

              <h1 class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
                Там, где заводится <br>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-amber-500">
                  само Время...
                </span>
              </h1>

              <p class="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Мышонок ложился спать знойным летом, а проснулся среди снежной вьюги. Время в мире сломалось! Отправляйтесь в чарующий Часовий Город, крутите стрелки часов, меняйте времена года и откройте великую тайну Вечности.
              </p>

              <!-- CTA Action Buttons -->
              <div class="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
                <button id="hero-play-btn" class="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95">
                  <span class="text-lg">▶</span>
                  <span>Играть онлайн в 3D</span>
                </button>

                <a href="#download" class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold text-sm backdrop-blur-md flex items-center justify-center gap-2 transition-all hover:border-amber-400/50">
                  <span>📥</span>
                  <span>Скачать на Android (APK)</span>
                </a>

                <button id="pwa-hero-btn" class="hidden w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2">
                  <span>📱</span>
                  <span>Установить PWA</span>
                </button>
              </div>

              <!-- Quick Badges -->
              <div class="flex items-center gap-6 pt-4 text-xs text-slate-400">
                <div class="flex items-center gap-1.5">
                  <span class="text-emerald-400 font-bold">✓</span> Без рекламы
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-emerald-400 font-bold">✓</span> 3D Диорама 60 FPS
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-emerald-400 font-bold">✓</span> Озвучка RU / EN / DE
                </div>
              </div>
            </div>

            <!-- Right Column: Interactive 3D Teaser Card -->
            <div class="lg:col-span-5 relative">
              <div class="relative rounded-3xl p-1 bg-gradient-to-b from-amber-400/40 via-purple-500/30 to-amber-500/10 shadow-2xl shadow-purple-950/80 group">
                <div class="relative rounded-[22px] overflow-hidden bg-[#150f28] aspect-[4/5] flex flex-col justify-end p-6 border border-white/10">
                  <img src="/assets/images/ios111.jpg" alt="Часовий Город" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700">
                  <div class="absolute inset-0 bg-gradient-to-t from-[#150f28] via-[#150f28]/40 to-transparent"></div>

                  <!-- Mouse Sprite Floating -->
                  <div class="relative z-10 flex flex-col items-center text-center">
                    <img src="/assets/characters/mouse_cutout.png" alt="Мышонок" class="w-36 h-auto drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] animate-bounce duration-1000 mb-4">
                    <span class="text-amber-300 font-extrabold text-xl">«Там, где заводится время»</span>
                    <span class="text-xs text-slate-300 mt-1">Нажмите, чтобы погрузиться в живой 3D-мир</span>

                    <button id="card-play-btn" class="mt-4 px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/40 flex items-center gap-2 active:scale-95 transition-all">
                      <span>🎮 Запустить 3D-сцену</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- Characters Gallery Section -->
        <section id="characters" class="py-20 px-4 md:px-8 bg-[#110c22] border-t border-b border-white/5 relative">
          <div class="max-w-7xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-16">
              <span class="text-amber-400 text-xs font-bold uppercase tracking-wider">Обитатели сказочной вселенной</span>
              <h2 class="text-3xl sm:text-4xl font-black text-white mt-2">Герои, с которыми вы подружитесь</h2>
              <p class="text-slate-400 text-sm mt-3">Каждый персонаж хранит свой взгляд на время, мечты и тайны Мельничного Пути</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <!-- Character 1: Мышонок -->
              <div class="bg-[#18112d] border border-amber-500/20 hover:border-amber-400/60 rounded-3xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 shadow-xl group">
                <div class="w-36 h-44 flex items-center justify-center overflow-hidden mb-4">
                  <img src="/assets/characters/mouse_cutout.png" alt="Мышонок" class="max-h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform">
                </div>
                <h3 class="text-lg font-bold text-amber-200">Мышонок</h3>
                <span class="text-xs text-amber-400/80 font-medium mb-3">Хранитель любознательности</span>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Родился в центре галактики тысячи лет назад, но ему всегда 5 лет. Любит сыры, понимает язык растений и звезд, ищет мед Млечного пути.
                </p>
              </div>

              <!-- Character 2: Улитка Матильда -->
              <div class="bg-[#18112d] border border-amber-500/20 hover:border-amber-400/60 rounded-3xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 shadow-xl group">
                <div class="w-36 h-44 flex items-center justify-center overflow-hidden mb-4">
                  <img src="/assets/characters/Ули.png" alt="Улитка Матильда" class="max-h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform">
                </div>
                <h3 class="text-lg font-bold text-amber-200">Улитка Матильда</h3>
                <span class="text-xs text-amber-400/80 font-medium mb-3">«Гений Успешности»</span>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Поёт заводную песенку про тайм-менеджмент, коучей, этикет и стиль. Знает всё о том, как успевать всё на свете не торопясь.
                </p>
              </div>

              <!-- Character 3: Кот-Снохранитель -->
              <div class="bg-[#18112d] border border-amber-500/20 hover:border-amber-400/60 rounded-3xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 shadow-xl group">
                <div class="w-36 h-44 flex items-center justify-center overflow-hidden mb-4">
                  <img src="/assets/characters/кот.png" alt="Кот" class="max-h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform">
                </div>
                <h3 class="text-lg font-bold text-amber-200">Кот-Снохранитель</h3>
                <span class="text-xs text-amber-400/80 font-medium mb-3">Мурлыкающий страж снов</span>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Оберегает покой спящих миров, знает, как отличить настоящий сон от иллюзии, и мягко мурлычет, когда время течет правильно.
                </p>
              </div>

              <!-- Character 4: Архи -->
              <div class="bg-[#18112d] border border-amber-500/20 hover:border-amber-400/60 rounded-3xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 shadow-xl group">
                <div class="w-36 h-44 flex items-center justify-center overflow-hidden mb-4">
                  <img src="/assets/characters/Архи.png" alt="Архи" class="max-h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform">
                </div>
                <h3 class="text-lg font-bold text-amber-200">Архи-Часовщик</h3>
                <span class="text-xs text-amber-400/80 font-medium mb-3">Инженер Часовьего города</span>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Знает строение каждого маятника, колесика и шестеренки. Помогает Мышонку разгадать причину сбоя времен года.
                </p>
              </div>

            </div>
          </div>
        </section>

        <!-- 3D & Gameplay Features Section -->
        <section id="features" class="py-20 px-4 md:px-8 relative">
          <div class="max-w-7xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-16">
              <span class="text-amber-400 text-xs font-bold uppercase tracking-wider">Технологии и магия</span>
              <h2 class="text-3xl sm:text-4xl font-black text-white mt-2">Как устроена наша 3D-сказка</h2>
              <p class="text-slate-400 text-sm mt-3">Мы соединили классическую иллюстрированную книгу и современные 3D-технологии WebGL</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div class="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md flex flex-col gap-4">
                <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl">
                  🔄
                </div>
                <h3 class="text-xl font-bold text-white">Живая 3D-Диорама</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Уютная комната Мышонка создана в настоящем 3D объеме. Вращайте сцену пальцем, заглядывайте за мебель, разглядывайте детали и наслаждайтесь кинематографичным светом.
                </p>
              </div>

              <div class="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md flex flex-col gap-4">
                <div class="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-2xl">
                  ❄️
                </div>
                <h3 class="text-xl font-bold text-white">4 Сезона в Реальном Времени</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Крутите стрелки часов, и мир за окном мгновенно преображается: зимняя метель с 3D-снежинками, кружащиеся золотые листья осени, весенние лепестки и летние светлячки.
                </p>
              </div>

              <div class="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md flex flex-col gap-4">
                <div class="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-2xl">
                  🎙️
                </div>
                <h3 class="text-xl font-bold text-white">3 Языка Озвучки (RU, EN, DE)</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Профессиональная авторская озвучка диктора и караоке-подсветка текста. Идеально для детей, семейного чтения и легкого изучения иностранных языков.
                </p>
              </div>

            </div>
          </div>
        </section>

        <!-- Download & Platforms Section -->
        <section id="download" class="py-20 px-4 md:px-8 bg-[#0a0715] border-t border-white/10 relative">
          <div class="max-w-5xl mx-auto text-center">
            <span class="text-amber-400 text-xs font-bold uppercase tracking-wider">Играйте где угодно</span>
            <h2 class="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">Выберите удобный способ игры</h2>
            <p class="text-slate-400 text-base max-w-xl mx-auto mb-12">Сказка запускается на смартфонах, планшетах, смарт-ТВ и компьютерах без сложной настройки.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              
              <!-- Card 1: Browser 3D -->
              <div class="bg-[#150f28] border border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div class="text-3xl mb-4">🌐</div>
                  <h3 class="text-lg font-bold text-white">В Браузере Онлайн</h3>
                  <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                    Ничего не нужно скачивать. Нажмите кнопку и играйте прямо сейчас на любом устройстве.
                  </p>
                </div>
                <button id="download-play-btn" class="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs text-center transition-all">
                  Запустить игру сейчас
                </button>
              </div>

              <!-- Card 2: Android APK -->
              <div class="bg-[#150f28] border border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div class="absolute top-3 right-3 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  Android
                </div>
                <div>
                  <div class="text-3xl mb-4">🤖</div>
                  <h3 class="text-lg font-bold text-white">Android Приложение (.APK)</h3>
                  <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                    Скачайте APK-файл на телефон или планшет. Работает автономно без подключения к интернету.
                  </p>
                </div>
                <a href="https://disk.yandex.ru/d/so19Hk0z0sjIkg" target="_blank" class="mt-6 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5">
                  <span>📥</span> <span>Скачать APK (Яндекс.Диск)</span>
                </a>
              </div>

              <!-- Card 3: PWA / iOS & Android -->
              <div class="bg-[#150f28] border border-purple-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div class="text-3xl mb-4">📲</div>
                  <h3 class="text-lg font-bold text-white">PWA на Экран «Домой»</h3>
                  <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                    Устанавливается в один клик через Safari или Chrome как полноценное нативное приложение.
                  </p>
                </div>
                <button id="download-pwa-btn" class="mt-6 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center transition-all">
                  Установить на устройство
                </button>
              </div>

            </div>

            <!-- App Store Teaser -->
            <div class="mt-12 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
              <span class="text-base">🍎</span>
              <span>Версия для iOS в <strong>Apple App Store</strong> находится в стадии подготовки к публикации</span>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="mt-auto border-t border-white/5 bg-[#090612] py-10 px-4 md:px-8 text-center text-xs text-slate-500">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 font-bold">Мышонок в Часовьем городе</span>
              <span>© 2026</span>
            </div>
            <div>
              «Время — это Игрушка Вечности и одновременно её символ!»
            </div>
            <div class="text-slate-400">
              По мотивам оригинальной сказки Йозефа
            </div>
          </div>
        </footer>

      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    const launch = () => this.onPlayClick();

    document.getElementById('header-play-btn')?.addEventListener('click', launch);
    document.getElementById('hero-play-btn')?.addEventListener('click', launch);
    document.getElementById('card-play-btn')?.addEventListener('click', launch);
    document.getElementById('download-play-btn')?.addEventListener('click', launch);

    const install = () => this.triggerInstall();
    document.getElementById('pwa-install-btn')?.addEventListener('click', install);
    document.getElementById('pwa-hero-btn')?.addEventListener('click', install);
    document.getElementById('download-pwa-btn')?.addEventListener('click', install);
  }
}
