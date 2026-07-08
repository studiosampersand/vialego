
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
if (menu) menu.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => nav?.classList.remove('open'))
);

let deferredInstallPrompt = null;

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function showInstallBanner() {
  if (isStandalone() || document.getElementById('siteInstallBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'siteInstallBanner';
  banner.className = 'site-install-banner';
  banner.innerHTML = `
    <div>
      <strong>Install MoBud as an app</strong>
      <span>Use the webapp fullscreen from your home screen.</span>
    </div>
    <div class="site-install-actions">
      <button type="button" class="site-install-later">Later</button>
      <button type="button" class="site-install-now">Install</button>
    </div>
  `;
  document.body.prepend(banner);

  banner.querySelector('.site-install-later').addEventListener('click', () => {
    sessionStorage.setItem('mobud-site-install-dismissed', '1');
    banner.remove();
  });

  banner.querySelector('.site-install-now').addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.remove();
      return;
    }

    if (isIos()) {
      alert('On iPhone or iPad: tap Share, then “Add to Home Screen”.');
      return;
    }

    window.location.href = '/app/';
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!sessionStorage.getItem('mobud-site-install-dismissed')) {
    showInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('siteInstallBanner')?.remove();
});

window.addEventListener('load', () => {
  if (isIos() && !isStandalone() && !sessionStorage.getItem('mobud-site-install-dismissed')) {
    showInstallBanner();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/site-service-worker.js', { scope: '/' })
      .catch(error => console.warn('Public-site service worker registration failed:', error));
  });
}

async function initFaq() {
  const list = document.querySelector('#faqList');
  if (!list) return;

  const search = document.querySelector('#faqSearch');
  const buttons = [...document.querySelectorAll('[data-category]')];
  let category = 'all';
  let items = [];

  try {
    const res = await fetch('/content/faq.json');
    items = await res.json();
  } catch (error) {
    list.innerHTML = '<div class="card">FAQ could not be loaded.</div>';
    return;
  }

  const render = () => {
    const q = (search?.value || '').toLowerCase();
    const filtered = items.filter(item => {
      const question = (item.question?.en || '').toLowerCase();
      const answer = (item.answer?.en || '').toLowerCase();
      return (category === 'all' || item.category === category) &&
             (question.includes(q) || answer.includes(q));
    });

    list.innerHTML = filtered.map((item, index) => `
      <article class="faq-item">
        <button class="faq-question" aria-expanded="false">
          <span>${index + 1}. ${item.question.en}</span><span>⌄</span>
        </button>
        <div class="faq-answer">${item.answer.en}</div>
      </article>
    `).join('') || '<div class="card">No matching questions.</div>';

    list.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        item.classList.toggle('open');
        button.setAttribute('aria-expanded', item.classList.contains('open'));
      });
    });
  };

  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(other => other.classList.remove('active'));
    button.classList.add('active');
    category = button.dataset.category;
    render();
  }));

  search?.addEventListener('input', render);
  render();
}

initFaq();
