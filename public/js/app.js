// Register service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.debug('SW registration failed', err));
  });
}

// Optional: soft page fade-in
document.documentElement.classList.add('ready');
