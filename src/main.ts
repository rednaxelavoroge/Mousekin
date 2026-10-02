import { BookViewer } from './book/BookViewer';

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration error:', err);
    });
  });
}

// Initialize Book Viewer
const appElement = document.getElementById('app');
if (appElement) {
  new BookViewer(appElement);
} else {
  console.error('Failed to find #app element');
}
