const Lightbox = (function () {
  let fileList = [];
  let currentIndex = 0;
  let dialogEl = null;
  let activeMediaEl = null;
  let touchStartX = 0;
  let touchEndX = 0;

  function init() {
    dialogEl = document.getElementById('lightbox-dialog');
    if (!dialogEl) return;

    // Prev / Next buttons
    const prevBtn = dialogEl.querySelector('.lightbox-nav-btn.prev');
    const nextBtn = dialogEl.querySelector('.lightbox-nav-btn.next');
    const closeBtn = dialogEl.querySelector('.lightbox-close-btn');

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Click backdrop to close
    dialogEl.addEventListener('click', (e) => {
      if (e.target === dialogEl || e.target.classList.contains('lightbox-body')) {
        close();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!dialogEl.hasAttribute('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });

    // Mobile touch swipe gestures
    const bodyEl = dialogEl.querySelector('.lightbox-body');
    if (bodyEl) {
      bodyEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      bodyEl.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });
    }
  }

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        next();
      } else {
        prev();
      }
    }
  }

  function open(files, index) {
    if (!dialogEl) init();
    fileList = files;
    currentIndex = index;
    updateContent();

    if (dialogEl.showModal) {
      dialogEl.showModal();
    } else {
      dialogEl.setAttribute('open', '');
    }

    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!dialogEl) return;
    if (activeMediaEl && activeMediaEl.tagName === 'VIDEO') {
      activeMediaEl.pause();
    }
    if (dialogEl.close) {
      dialogEl.close();
    } else {
      dialogEl.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }

  function prev() {
    if (fileList.length === 0) return;
    currentIndex = (currentIndex - 1 + fileList.length) % fileList.length;
    updateContent();
  }

  function next() {
    if (fileList.length === 0) return;
    currentIndex = (currentIndex + 1) % fileList.length;
    updateContent();
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateContent() {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[currentIndex];
    const cdnUrl = ManifestStore.getCDNUrl(file.path);
    const githubUrl = ManifestStore.getGitHubBlobUrl(file.path);

    const mediaContainer = dialogEl.querySelector('.lightbox-media-container');
    const counterEl = dialogEl.querySelector('.lightbox-counter');
    const titleEl = dialogEl.querySelector('.lightbox-title');
    const metaEl = dialogEl.querySelector('.lightbox-meta');
    const downloadBtn = dialogEl.querySelector('.lightbox-download-btn');
    const githubBtn = dialogEl.querySelector('.lightbox-github-btn');
    const copyBtn = dialogEl.querySelector('.lightbox-copy-btn');

    if (counterEl) {
      counterEl.textContent = `${currentIndex + 1} of ${fileList.length}`;
    }

    if (titleEl) {
      titleEl.textContent = file.alt;
    }

    if (metaEl) {
      metaEl.innerHTML = `
        <span>Category: <strong>${file.category}</strong></span>
        <span>•</span>
        <span>Format: <strong>${file.ext.toUpperCase()}</strong></span>
        <span>•</span>
        <span>Size: <strong>${formatBytes(file.bytes)}</strong></span>
      `;
    }

    if (mediaContainer) {
      mediaContainer.innerHTML = '';
      if (file.type === 'video') {
        const wrapper = document.createElement('div');
        wrapper.className = 'lightbox-media-wrapper loading';
        wrapper.innerHTML = `<div class="spinner"></div>`;

        const video = document.createElement('video');
        video.className = 'lightbox-media';
        video.src = cdnUrl;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;

        video.addEventListener('loadeddata', () => {
          wrapper.classList.remove('loading');
          const spinner = wrapper.querySelector('.spinner');
          if (spinner) spinner.remove();
        });

        wrapper.appendChild(video);
        mediaContainer.appendChild(wrapper);
        activeMediaEl = video;
      } else {
        const previewUrl = ManifestStore.getLightboxUrl(file.path, 1600);
        const img = document.createElement('img');
        img.className = 'lightbox-media';
        img.src = previewUrl;
        img.alt = file.alt;

        img.addEventListener('error', () => {
          if (img.src !== cdnUrl) {
            img.src = cdnUrl;
          }
        });

        mediaContainer.appendChild(img);
        activeMediaEl = img;
      }
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => Gallery.triggerDownload(file, downloadBtn);
    }

    if (githubBtn) {
      githubBtn.href = githubUrl;
    }

    if (copyBtn) {
      copyBtn.onclick = () => Gallery.copyDirectLink(file);
    }

    // Update URL hash to point to wallpaper
    window.history.replaceState(null, '', `#wallpaper/${file.category}/${file.name}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    open,
    close,
    prev,
    next
  };
})();
