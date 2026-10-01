import { LandingPage } from './ui/LandingPage';
import { DioramaScene } from './game/DioramaScene';
import { SoundManager } from './game/AudioSystem';
import { GameController } from './game/GameController';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration error:', err);
    });
  });
}

const landingContainer = document.getElementById('landing-container')!;
const gameContainer = document.getElementById('game-container')!;
const canvasContainer = document.getElementById('canvas-container')!;
const hudContainer = document.getElementById('hud-container')!;

let dioramaScene: DioramaScene | null = null;
let soundManager: SoundManager | null = null;
let gameController: GameController | null = null;
let isGameActive = false;
let animationFrameId: number | null = null;

function launchGame() {
  landingContainer.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  isGameActive = true;

  if (!dioramaScene) {
    soundManager = new SoundManager();
    dioramaScene = new DioramaScene(canvasContainer, soundManager);
    gameController = new GameController(dioramaScene, soundManager, hudContainer);

    // Render loop
    const animate = (time: number) => {
      if (isGameActive && dioramaScene) {
        dioramaScene.render(time * 0.001);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
  }

  // Resize canvas to match fullscreen container
  if (dioramaScene) {
    setTimeout(() => {
      dioramaScene?.onWindowResize();
    }, 50);
  }

  // Play intro audio
  soundManager?.playMusic();
  soundManager?.playSceneNarration(0);
}

function closeGame() {
  gameContainer.classList.add('hidden');
  landingContainer.classList.remove('hidden');
  isGameActive = false;
}

window.addEventListener('close-game', closeGame);

// Initialize Landing Page
new LandingPage(landingContainer, launchGame);

if (window.location.hash === '#play') {
  launchGame();
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#play') {
    launchGame();
  } else if (window.location.hash === '') {
    closeGame();
  }
});
