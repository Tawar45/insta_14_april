/**
 * AI Instafeed - Storefront Extension
 * Mirrors the admin dashboard preview container EXACTLY.
 * Polls for live config changes every 30 seconds for instant updates.
 */

(function () {
  "use strict";

  if (window.__aiInstafeedInit) return;
  window.__aiInstafeedInit = true;

  const POLL_INTERVAL = 30000;
  const MAX_FEED_ITEMS = 500;
  const PROXY_URL = "/apps/instafeed/data";

  let cachedConfig = null;
  let cachedGridMedia = [];
  let cachedStoryMedia = [];

  // Helper to find the stylesheet link URL in host page fallback
  function getCssUrl() {
    const link = document.querySelector('link[href*="instafeed-front.css"]');
    return link ? link.getAttribute('href') : '';
  }

  // ── Placeholder images (same as dashboard fallbacks) ─────────────────────
  const PLACEHOLDERS = [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1539106604-24283ef1677b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1529139513364-c4d1221e93c0?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1485230895905-ec17bd36b5cc?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1475184447565-30060953d611?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=600&h=600&fit=crop",
  ];

  function getMedia(mediaData, count) {
    if (mediaData.length > 0) {
      return mediaData.slice(0, Math.min(count, MAX_FEED_ITEMS));
    }
    const base = [];
    for (let i = 0; i < count; i++) {
      base.push({
        id: 'placeholder_' + i,
        media_url: PLACEHOLDERS[i % PLACEHOLDERS.length],
        media_type: "IMAGE",
        like_count: Math.floor(Math.random() * 200) + 50,
        comments_count: Math.floor(Math.random() * 20) + 2,
        permalink: "#"
      });
    }
    return base.slice(0, Math.min(count, MAX_FEED_ITEMS));
  }

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function checkTrackOverflow(track, wrapper) {
    if (!track || !wrapper) return;
    const hasOverflow = track.scrollWidth > track.clientWidth;
    const navButtons = wrapper.querySelectorAll(".ai-fw-nav");
    navButtons.forEach(btn => {
      btn.style.setProperty("display", hasOverflow ? "flex" : "none", "important");
    });
  }

  function bindCarouselNav(root) {
    const wrapper = root.querySelector(".ai-fw-carousel-wrapper");
    const track = root.querySelector(".ai-fw-track");
    
    if (track && wrapper) {
      setTimeout(() => checkTrackOverflow(track, wrapper), 50);
      setTimeout(() => checkTrackOverflow(track, wrapper), 300);
      
      if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          checkTrackOverflow(track, wrapper);
        });
        observer.observe(track);
        if (track.__resizeObserver) {
          track.__resizeObserver.disconnect();
        }
        track.__resizeObserver = observer;
      }
    }

    root.querySelectorAll(".ai-fw-nav").forEach((btn) => {
      btn.addEventListener("click", () => {
        const trackId = btn.getAttribute("data-track-id");
        const track   = trackId ? root.querySelector("#" + trackId) : null;
        if (!track) return;
        const amount = track.clientWidth * 0.8;
        track.scrollBy({ left: btn.classList.contains("ai-fw-prev") ? -amount : amount, behavior: "smooth" });
      });
    });
  }

  // ── InstafeedGrid Custom Element ───────────────────────────────────────────
  class InstafeedGrid extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.currentDisplayLimit = 0;
      this.infiniteObserver = null;
      this.config = null;
      this.mediaData = null;
    }

    connectedCallback() {
      if (cachedConfig && cachedGridMedia) {
        this.render(cachedConfig, cachedGridMedia);
      }
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
      if (this.infiniteObserver) {
        this.infiniteObserver.disconnect();
      }
    }

    _handleClick(e) {
      const gridItem = e.target.closest(".ai-grid-item");
      if (gridItem) {
        const itemId = gridItem.getAttribute("data-id");
        this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
          bubbles: true,
          composed: true,
          detail: {
            id: itemId,
            source: "grid",
            media: this.mediaData,
            config: this.config,
            cssUrl: this.getAttribute("css-url") || getCssUrl()
          }
        }));
      }
    }

    render(config, mediaData) {
      this.config = config;
      this.mediaData = mediaData;

      const c          = config.postFeed;
      const isMobile   = window.innerWidth <= 768;
      const columns    = isMobile ? c.mobileColumns : c.desktopColumns;
      const baseLimit  = isMobile ? (c.mobileLimit || 4) : (c.desktopLimit || 8);
      const limit      = c.load ? Math.max(baseLimit, this.currentDisplayLimit) : baseLimit;

      if (!c.load) {
        this.currentDisplayLimit = 0;
        if (this.infiniteObserver) {
          this.infiniteObserver.disconnect();
          this.infiniteObserver = null;
        }
      }

      const gap        = c.gap;
      const mediaItems = getMedia(mediaData, limit);
      const trackId    = 'ai-fw-grid-track-' + Date.now();
      const hSize      = c.typography?.heading?.size ? (c.typography.heading.size + (isMobile ? 0 : 2)) : 18;
      const subSize    = c.typography?.subheading?.size ? (c.typography.subheading.size + (isMobile ? 0 : 1)) : 12;
      const cssUrl     = this.getAttribute("css-url") || getCssUrl();

      let styleLink = "";
      if (cssUrl) {
        styleLink = `<link rel="stylesheet" href="${cssUrl}">`;
      }

      let html = styleLink + '<div class="ai-instafeed-root" style="font-family:inherit;width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;padding-top:' + (c.paddingTop ?? 32) + 'px;padding-bottom:' + (c.paddingBottom ?? 32) + 'px;">';

      if (c.header && ((c.heading && c.heading.trim()) || (c.subheading && c.subheading.trim()))) {
        html += '<div style="text-align:' + c.alignment + ';margin-bottom:24px;">';
        if (c.heading && c.heading.trim()) {
          html += '<h2 style="font-size:' + hSize + 'px;font-weight:' + (c.typography?.heading?.weight || '800') + ';color:' + (c.typography?.heading?.color || '#000') + ';margin:0 0 8px 0;line-height:1.2;">' + esc(c.heading) + '</h2>';
        }
        if (c.subheading && c.subheading.trim()) {
          html += '<p style="font-size:' + subSize + 'px;font-weight:' + (c.typography?.subheading?.weight || '500') + ';color:' + (c.typography?.subheading?.color || '#666') + ';margin:0;">' + esc(c.subheading) + '</p>';
        }
        html += '</div>';
      }

      if (c.carousel) {
        const itemWidth = 'calc((100% - ' + ((columns - 1) * gap) + 'px) / ' + columns + ')';
        const navBtnStyle = 'outline:none!important;-webkit-appearance:none!important;appearance:none!important;color:#1e293b!important;';
        html += '<div class="ai-fw-carousel-wrapper" style="position:relative;width:100%;">'
              + '<div class="ai-fw-nav ai-fw-prev" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Previous" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M12 16l-4-4 4-4"/></svg></div>'
              + '<div class="ai-fw-track" id="' + trackId + '" style="display:flex;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;gap:' + gap + 'px;padding:' + gap + 'px 0;">';
        mediaItems.forEach((item) => { html += this.renderMediaCard(item, c, itemWidth); });
        
        if (c.load && mediaData.length > limit) {
          html += '<div id="ai-infinite-sentinel" style="flex-shrink:0;width:60px;display:flex;align-items:center;justify-content:center;">'
                + '<div style="width:20px;height:20px;border:2px solid #ddd;border-top-color:#6366f1;border-radius:50%;animation:ai-spin 0.8s linear infinite;"></div>'
                + '</div>';
        }
        html += '</div>'
              + '<div class="ai-fw-nav ai-fw-next" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Next" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M8 16l4-4-4-4"/></svg></div>'
              + '</div>';
      } else {
        html += '<div id="ai-grid-body" style="display:grid;grid-template-columns:repeat(' + columns + ',1fr);gap:' + gap + 'px;">';
        mediaItems.forEach((item) => { html += this.renderMediaCard(item, c, '100%'); });
        html += '</div>';
        
        if (c.load && mediaData.length > limit) {
          html += '<div id="ai-infinite-sentinel" style="height:40px;width:100%;display:flex;align-items:center;justify-content:center;margin-top:20px;">'
                + '<div style="width:20px;height:20px;border:2px solid #ddd;border-top-color:#6366f1;border-radius:50%;animation:ai-spin 0.8s linear infinite;"></div>'
                + '</div>';
        }
      }

      if (!c.removeWatermark) {
        const logoUrl = this.getAttribute("data-logo-url") || "";
        if (logoUrl) {
          html += '<div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;"><img src="' + logoUrl + '" style="height:16px !important;width:auto !important;max-width:none !important;max-height:16px !important;vertical-align:middle !important;display:inline-block !important;" alt="BOOST STAR Experts" /></a></div>';
        } else {
          html += '<div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:#64748b;text-decoration:none;">BOOST STAR Experts</a></div>';
        }
      }

      html += '</div>';
      this.shadowRoot.innerHTML = html;
      bindCarouselNav(this.shadowRoot);

      if (c.load && mediaData.length > limit) {
        this.setupInfiniteScroll(config, mediaData);
      }
    }

    renderMediaCard(item, c, width) {
      const rawType   = (item.media_type || "").toUpperCase();
      const isVideo   = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
      const isAlbum   = rawType === "CAROUSEL_ALBUM" || rawType === "ALBUM";
      const thumbUrl  = item.thumbnail_url || "";
      const posterAttr = thumbUrl ? ` poster="${esc(thumbUrl)}"` : "";
      let inner = "";
      if (isVideo) {
        if (c.autoplay) {
          inner = `<video src="${esc(item.media_url)}"${posterAttr} autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
        } else if (thumbUrl) {
          inner = `<img loading="lazy" src="${esc(thumbUrl)}" alt="Instagram post" style="width:100%;height:100%;object-fit:cover;display:block;">`;
        } else if (item.media_url) {
          inner = `<video src="${esc(item.media_url)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
        } else {
          inner = `<div style="width:100%;height:100%;background:#f1f5f9;"></div>`;
        }
      } else if (item.media_url) {
        inner = `<img loading="lazy" src="${esc(item.media_url)}" alt="Instagram post" style="width:100%;height:100%;object-fit:cover;display:block;">`;
      } else {
        inner = `<div style="width:100%;height:100%;background:#f1f5f9;"></div>`;
      }
      let mediaIcon = "";
      if (isVideo) {
        mediaIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M2 7.25h3.614L9.364 2H6a4 4 0 0 0-4 4v1.25Zm20 0h-6.543l3.641-5.097A4.002 4.002 0 0 1 22 6v1.25ZM2 8.75h20V18a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8.75Zm5.457-1.5L11.207 2h6.157l-3.75 5.25H7.457Zm7.404 7.953a.483.483 0 0 0 0-.837l-3.985-2.3a.483.483 0 0 0-.725.418v4.601c0 .372.403.605.725.419l3.985-2.301Z" /></svg>`;
      } else if (isAlbum) {
        mediaIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" d="M20.453 8.5c.005.392.005.818.005 1.279v3.2c0 1.035 0 1.892-.057 2.591-.06.728-.187 1.403-.511 2.038a5.214 5.214 0 0 1-2.278 2.279c-.636.323-1.31.451-2.038.51-.699.058-1.556.058-2.59.058h-3.2c-.32 0-.624 0-.911-.002H5.395A3.856 3.856 0 0 0 8.485 22h7.724A5.793 5.793 0 0 0 22 16.207V8.483a3.856 3.856 0 0 0-1.548-3.093V8.5Z"/><path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M2 5.4A3.4 3.4 0 0 1 5.4 2h10.2A3.4 3.4 0 0 1 19 5.4v5.482l-1.91-1.25a4.037 4.037 0 0 0-4.767.253L7.87 13.528a2.763 2.763 0 0 1-3.262.173L2 11.994V5.4Zm14.392 5.299L19 12.406V15.6a3.4 3.4 0 0 1-3.4 3.4H5.4A3.4 3.4 0 0 1 2 15.6v-2.082l1.91 1.25a4.038 4.038 0 0 0 4.767-.253l4.453-3.643a2.763 2.763 0 0 1 3.262-.173ZM7.525 9.65a2.125 2.125 0 1 0 0-4.25 2.125 2.125 0 0 0 0 4.25Z"/></svg>`;
      } else {
        mediaIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM5 19V5h14l.002 14H5z"/><path fill="#FFFFFF" d="m10 14-1-1-3 4h12l-5-7z"/><circle fill="#FFFFFF" cx="8.5" cy="8.5" r="1.5"/></svg>`;
      }

      const metrics = c.metrics ? `
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M14.5 3c-1.2 0-2.3.6-3 1.5-.7-.9-1.8-1.5-3-1.5-1.2 0-2.6.4-3.2 2-.6 1.6.2 3.7 1.8 5.4 1.5 1.6 4.4 4.1 4.4 4.1s2.9-2.5 4.4-4.1c1.6-1.7 2.4-3.8 1.8-5.4-.6-1.6-2-2-3.2-2z"/></svg>
          <span>${item.like_count || 0}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M17 14c-.5 0-1 .4-1 1v2H4V5h12v2c0 .5.4 1 1 1s1-.5 1-1V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2-2 2h12.6l2.7 2.7c.1.1.2.2.3.2.4.1.8-.1 1-.5V8c0-.5-.4-1-1-1s-1 .4-1 1v6c0 .5-.4 1-1 1z"/></svg>
          <span>${item.comments_count || 0}</span>
        </div>` : "";
      const instagramLogo = (c.showInstagramIcon !== false) ? `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>` : "";
      const aspect = (c.aspectRatio && c.aspectRatio !== "auto") ? c.aspectRatio : "4/5";
      const itemStyle = (aspect !== "auto") ? `aspect-ratio:${aspect};` : "";

      return `
        <div class="ai-grid-wrapper" style="flex-shrink:0; width:${width}; box-sizing:border-box; display:flex;">
          <div class="ai-grid-item" data-id="${item.id || item.media_url.slice(-20)}" 
               style="text-decoration:none; display:flex; flex-direction:column; cursor:pointer; width:100%; height:100%; background:#f1f5f9; position:relative; ${itemStyle}">
              ${inner}
              <div class="ai-badge">${mediaIcon}</div>
              <div class="ai-card-overlay"></div>
              <div class="ai-metrics">${metrics}</div>
              <div class="ai-ig-icon">${instagramLogo}</div>
          </div>
        </div>`;
    }

    setupInfiniteScroll(config, mediaData) {
      const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
      if (!sentinel) return;
      if (this.infiniteObserver) this.infiniteObserver.disconnect();

      const c = config.postFeed;
      const isMobile = window.innerWidth <= 768;
      const initialLimit = isMobile ? (c.mobileLimit || 4) : (c.desktopLimit || 8);
      if (this.currentDisplayLimit < initialLimit) {
        this.currentDisplayLimit = initialLimit;
      }

      const track = this.shadowRoot.querySelector('.ai-fw-track');
      const observerRoot = (c.carousel && track) ? track : null;

      this.infiniteObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          if (this.currentDisplayLimit < mediaData.length) {
            this.currentDisplayLimit += (isMobile ? 6 : 12);
            this.appendMoreItems(config, mediaData, this.currentDisplayLimit);
          } else {
            this.infiniteObserver.disconnect();
            const s = this.shadowRoot.querySelector('#ai-infinite-sentinel');
            if (s) s.style.display = 'none';
          }
        }
      }, { root: observerRoot, rootMargin: '150px', threshold: 0.1 });

      this.infiniteObserver.observe(sentinel);
    }

    appendMoreItems(config, mediaData, limit) {
      const c = config.postFeed;
      const isMobile = window.innerWidth <= 768;
      const columns = isMobile ? c.mobileColumns : c.desktopColumns;
      const gap = c.gap;
      const batchSize = isMobile ? 6 : 12;
      const prevLimit = Math.max(0, limit - batchSize);
      const newItems = mediaData.slice(prevLimit, limit);

      if (c.carousel) {
        const itemWidth = 'calc((100% - ' + ((columns - 1) * gap) + 'px) / ' + columns + ')';
        const track = this.shadowRoot.querySelector('.ai-fw-track');
        const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
        if (!track) { this.render(config, mediaData); return; }
        newItems.forEach(item => {
          const wrap = document.createElement('div');
          wrap.innerHTML = this.renderMediaCard(item, c, itemWidth);
          const el = wrap.firstElementChild;
          if (el) {
            if (sentinel && sentinel.parentNode === track) {
              track.insertBefore(el, sentinel);
            } else {
              track.appendChild(el);
            }
          }
        });
      } else {
        const gridBody = this.shadowRoot.querySelector('#ai-grid-body');
        if (!gridBody) { this.render(config, mediaData); return; }
        newItems.forEach(item => {
          const wrap = document.createElement('div');
          wrap.innerHTML = this.renderMediaCard(item, c, '100%');
          const el = wrap.firstElementChild;
          if (el) gridBody.appendChild(el);
        });
      }

      if (limit >= mediaData.length) {
        const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
        if (sentinel) sentinel.style.display = 'none';
        if (this.infiniteObserver) this.infiniteObserver.disconnect();
      }
    }
  }

  // ── InstafeedStory Custom Element ──────────────────────────────────────────
  class InstafeedStory extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.config = null;
      this.mediaData = null;
    }

    connectedCallback() {
      if (cachedConfig && cachedStoryMedia) {
        this.render(cachedConfig, cachedStoryMedia);
      }
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
    }

    _handleClick(e) {
      const storyItem = e.target.closest(".ai-story-item");
      if (storyItem) {
        const isPopup = this.config.stories.openPopup === true;
        if (isPopup) {
          e.preventDefault();
          const itemId = storyItem.getAttribute("data-id");
          this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
            bubbles: true,
            composed: true,
            detail: {
              id: itemId,
              source: "story",
              media: this.mediaData,
              config: this.config,
              cssUrl: this.getAttribute("css-url") || getCssUrl()
            }
          }));
        }
      }
    }

    render(config, mediaData) {
      this.config = config;
      this.mediaData = mediaData;

      const s         = config.stories;
      const ringColor = s.ringColor || config.postFeed?.typography?.heading?.color || "#6366f1";
      const storyItems = getMedia(mediaData, 15);
      const isActiveRing = s.activeRing !== false;
      const trackId = "ai-story-track-" + Date.now();
      const cssUrl = this.getAttribute("css-url") || getCssUrl();

      let styleLink = "";
      if (cssUrl) {
        styleLink = `<link rel="stylesheet" href="${cssUrl}">`;
      }

      let html = styleLink + `<div class="ai-instafeed-root" style="font-family:inherit;width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;overflow:hidden;padding-top:${s.paddingTop ?? 24}px;padding-bottom:${s.paddingBottom ?? 24}px;">`;

      if (s.showHeader && ((s.heading && s.heading.trim()) || (s.subheading && s.subheading.trim()))) {
        html += `
          <div style="text-align:${s.alignment};margin-bottom:24px;">`;
        if (s.heading && s.heading.trim()) {
          html += `<h4 style="font-size:${s.typography?.heading?.size || 28}px;font-weight:${s.typography?.heading?.weight || '800'};color:${s.typography?.heading?.color || '#000'};margin:0 0 8px 0;line-height:1.2;">${esc(s.heading)}</h4>`;
        }
        if (s.subheading && s.subheading.trim()) {
          html += `<p style="font-size:${s.typography?.subheading?.size || 14}px;font-weight:${s.typography?.subheading?.weight || '400'};color:${s.typography?.subheading?.color || '#666'};margin:0;">${esc(s.subheading)}</p>`;
        }
        html += `</div>`;
      }

      if (s.enable) {
        const isShowNav = s.showNavigation !== false;
        const storyNavBtnStyle = `outline:none!important;-webkit-appearance:none!important;appearance:none!important;color:#1e293b!important;`;
        html += `
          <div class="ai-fw-carousel-wrapper" style="position:relative;width:100%;">
            ${isShowNav ? `
              <div class="ai-fw-nav ai-fw-prev" data-track-id="${trackId}" role="button" tabindex="0" aria-label="Previous" style="${storyNavBtnStyle}width:28px;height:28px;left:0px;top:32px;transform:translateY(-50%);">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M12 16l-4-4 4-4"/></svg>
              </div>
            ` : ''}
            <div id="${trackId}" class="ai-fw-track" style="display:flex;width:100%;${s.alignment === 'center' ? 'margin:0 auto;' : s.alignment === 'right' ? 'margin:0 0 0 auto;' : 'margin:0 auto 0 0;'};overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;gap:16px;padding:8px 4px 12px;">`;

        storyItems.forEach((item, i) => {
          const rawType   = (item.media_type || "").toUpperCase();
          const isVideo   = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
          const thumbUrl  = item.thumbnail_url || "";
          const posterAttr = thumbUrl ? ` poster="${esc(thumbUrl)}"` : "";
          const href      = item.permalink || "#";
          const target    = href === "#" ? "_self" : "_blank";
          const label     = item.caption ? esc(item.caption.split(" ")[0]) : `Story ${i + 1}`;

          let mediaTpl = "";
          if (isVideo) {
            if (s.autoplay) {
              mediaTpl = `<video src="${esc(item.media_url)}"${posterAttr} autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
            } else if (thumbUrl) {
              mediaTpl = `<img loading="lazy" src="${esc(thumbUrl)}" alt="story" class="${s.animateImages ? 'ai-ken-burns' : ''}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
            } else if (item.media_url) {
              mediaTpl = `<video src="${esc(item.media_url)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
            } else {
              mediaTpl = `<div style="width:100%;height:100%;background:#f1f5f9;"></div>`;
            }
          } else if (item.media_url) {
            mediaTpl = `<img loading="lazy" src="${esc(item.media_url)}" alt="story" class="${s.animateImages ? 'ai-ken-burns' : ''}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
          } else {
            mediaTpl = `<div style="width:100%;height:100%;background:#f1f5f9;"></div>`;
          }

          const isPopup  = s.openPopup === true;
          const finalHref   = isPopup ? "javascript:void(0)" : href;

          html += `
            <div class="ai-story-item" data-id="${item.id || (item.media_url ? item.media_url.slice(-20) : '')}" style="flex-shrink:0;width:72px;text-align:center;cursor:pointer;">
              <a href="${esc(finalHref)}" target="${isPopup ? '_self' : target}" rel="noopener noreferrer" style="text-decoration:none;display:block;">
                <div class="ai-story-ring-wrapper" style="width:64px;height:64px;border-radius:50%;padding:3px;border: ${isActiveRing ? 'none' : '2px solid ' + ringColor};background:white;margin:0 auto 6px;position:relative; transform: translateZ(0); -webkit-transform: translateZ(0);">
                  ${isActiveRing ? `
                    <svg class="ai-story-ring-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                      <circle class="ai-story-ring-circle" cx="50" cy="50" r="47.5" stroke="${ringColor}" />
                    </svg>` : ''}
                  <div class="ai-story-image-container" style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#f1f5f9;position:relative;z-index:1;">${mediaTpl}</div>
                </div>
                <div class="ai-story-label" style="font-size:10px;color:#64748b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</div>
              </a>
            </div>`;
        });

        html += `</div>
            ${isShowNav ? `
              <div class="ai-fw-nav ai-fw-next" data-track-id="${trackId}" role="button" tabindex="0" aria-label="Next" style="${storyNavBtnStyle}width:28px;height:28px;right:0px;top:32px;transform:translateY(-50%);">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M8 16l4-4-4-4"/></svg>
              </div>
            ` : ''}
          </div>`;
      }
      html += `</div>`;
      this.shadowRoot.innerHTML = html;
      bindCarouselNav(this.shadowRoot);
    }
  }

  // ── InstafeedModal Custom Element ──────────────────────────────────────────
  class InstafeedModal extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.currentIndex = -1;
      this.activeMedia = [];
      this.config = null;
      this.source = 'grid';
      this._boundKeydown = this._handleKeydown.bind(this);
    }

    connectedCallback() {
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
      document.removeEventListener("keydown", this._boundKeydown);
    }

    _handleClick(e) {
      if (e.target.closest(".ai-modal-header-close") || e.target.closest(".ai-modal-float-close")) {
        this.close();
      } else if (e.target.closest(".ai-modal-prev")) {
        this.navigate(-1);
      } else if (e.target.closest(".ai-modal-next")) {
        this.navigate(1);
      } else if (e.target.closest(".ai-modal-sub-prev")) {
        this.navigateSub(-1);
      } else if (e.target.closest(".ai-modal-sub-next")) {
        this.navigateSub(1);
      } else if (e.target.closest(".ai-modal-carousel-dot")) {
        const dot = e.target.closest(".ai-modal-carousel-dot");
        const idx = parseInt(dot.getAttribute("data-index"), 10);
        if (!isNaN(idx)) {
          this.scrollToSubIndex(idx);
        }
      } else if (e.target.id === "ai-instafeed-modal-root") {
        this.close();
      }
    }

    _handleKeydown(e) {
      const showNav = this.config?.postFeed?.modalNavigation !== false;
      if (e.key === 'Escape') this.close();
      if (showNav) {
        if (e.key === 'ArrowRight' && (this.currentIndex < this.activeMedia.length - 1)) this.navigate(1);
        if (e.key === 'ArrowLeft'  && (this.currentIndex > 0)) this.navigate(-1);
      }
    }

    open(id, source, mediaList, config, cssUrl) {
      this.source = source;
      this.activeMedia = mediaList;
      this.config = config;
      this.cssUrl = cssUrl;

      const index = mediaList.findIndex(m => (m.id || (m.media_url ? m.media_url.slice(-20) : '')) === id);
      if (index === -1) return;

      document.removeEventListener("keydown", this._boundKeydown);
      document.addEventListener("keydown", this._boundKeydown);

      this.renderModal(index);
      this.setAttribute("active", "");
    }

    close() {
      const root = this.shadowRoot.querySelector('#ai-instafeed-modal-root');
      if (!root) return;

      // Stop video/audio immediately
      root.querySelectorAll('video').forEach(v => {
        v.pause();
        v.muted = true;
        v.src = '';
      });

      this.removeAttribute("active");
      this.shadowRoot.innerHTML = '';
      document.removeEventListener('keydown', this._boundKeydown);
    }

    navigate(dir) {
      const newIndex = this.currentIndex + dir;
      if (newIndex < 0 || newIndex >= this.activeMedia.length) return;
      this.renderModal(newIndex);
    }

    navigateSub(dir) {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slides = track.querySelectorAll('.ai-modal-carousel-slide');
      if (slides.length <= 1) return;

      if (this.currentSubIndex === undefined) {
        this.currentSubIndex = 0;
      }

      let newSubIndex = this.currentSubIndex + dir;
      if (newSubIndex < 0 || newSubIndex >= slides.length) return;

      const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
      track.scrollTo({ left: slideWidth * newSubIndex, behavior: 'smooth' });
    }

    scrollToSubIndex(idx) {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
      track.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
    }

    updateSubCarouselUI(index, totalSlides) {
      const dots = this.shadowRoot.querySelectorAll('.ai-modal-carousel-dot');
      dots.forEach((dot, idx) => {
        if (idx === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      const subPrev = this.shadowRoot.querySelector('.ai-modal-sub-prev');
      const subNext = this.shadowRoot.querySelector('.ai-modal-sub-next');
      if (subPrev) subPrev.style.display = index > 0 ? 'flex' : 'none';
      if (subNext) subNext.style.display = index < totalSlides - 1 ? 'flex' : 'none';
    }

    bindSubCarouselEvents() {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slides = track.querySelectorAll('.ai-modal-carousel-slide');
      if (slides.length <= 1) return;

      track.addEventListener('scroll', () => {
        const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
        if (slideWidth <= 0) return;
        const newIndex = Math.round(track.scrollLeft / slideWidth);
        if (newIndex !== this.currentSubIndex) {
          this.currentSubIndex = newIndex;
          this.updateSubCarouselUI(newIndex, slides.length);
        }
      }, { passive: true });
    }

    renderModal(index) {
      this.currentIndex = index;
      this.currentSubIndex = 0; // Reset sub-carousel index
      const item = this.activeMedia[index];
      if (!item) return;

      const showNav    = this.config.postFeed?.modalNavigation !== false;
      const hasPrev    = showNav && index > 0;
      const hasNext    = showNav && index < this.activeMedia.length - 1;

      const isVideo     = item.media_type === 'VIDEO';
      const enableSound = this.config.postFeed?.modalSound;
      const videoAttrs  = enableSound ? 'controls controlsList="nodownload"' : 'muted';

      // Build media HTML with support for multi-image children carousels
      const subChildren = item.children?.data || [];
      let mediaHtml = '';
      if (subChildren.length > 0) {
        const slidesHtml = subChildren.map((child, cIdx) => {
          const isChildVideo = child.media_type === 'VIDEO' || (child.media_url && child.media_url.toLowerCase().includes('.mp4'));
          const childVideoAttrs = enableSound ? 'controls controlsList="nodownload"' : 'muted';
          const childSrc = child.media_url;
          const childPosterAttr = child.thumbnail_url ? ` poster="${esc(child.thumbnail_url)}"` : '';
          return `<div class="ai-modal-carousel-slide">` +
            (isChildVideo
              ? `<video class="ai-modal-carousel-video" src="${childSrc}"${childPosterAttr} autoplay loop ${childVideoAttrs} playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;display:block;"></video>`
              : `<img src="${childSrc}" alt="Instagram carousel item" style="width:100%;height:100%;object-fit:contain;display:block;">`) +
            `</div>`;
        }).join('');

        const dotsHtml = `<div class="ai-modal-carousel-dots">` +
          subChildren.map((_, cIdx) => `<span class="ai-modal-carousel-dot${cIdx === 0 ? ' active' : ''}" data-index="${cIdx}"></span>`).join('') +
          `</div>`;

        const subPrevBtn = `<button class="ai-modal-sub-nav ai-modal-sub-prev" aria-label="Previous image" style="display:none;">` +
          `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#262626" stroke-width="2.5"><path d="M13 16l-5-5 5-5"/></svg>` +
          `</button>`;

        const subNextBtn = `<button class="ai-modal-sub-nav ai-modal-sub-next" aria-label="Next image">` +
          `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#262626" stroke-width="2.5"><path d="M7 16l5-5-5-5"/></svg>` +
          `</button>`;

        mediaHtml = `<div class="ai-modal-carousel-container">` +
          `<div class="ai-modal-carousel-track">` + slidesHtml + `</div>` +
          (subChildren.length > 1 ? subPrevBtn + subNextBtn + dotsHtml : '') +
          `</div>`;
      } else {
        const modalPosterAttr = item.thumbnail_url ? ' poster="' + esc(item.thumbnail_url) + '"' : '';
        mediaHtml = isVideo
          ? '<video id="ai-modal-video" src="' + item.media_url + '"' + modalPosterAttr + ' autoplay loop ' + videoAttrs + ' playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;display:block;"></video>'
          : '<img src="' + item.media_url + '" alt="Instagram post" style="width:100%;height:100%;object-fit:contain;display:block;">';
      }

      const handle   = this.config.instagramHandle || 'instagram';
      const caption  = item.caption ? item.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
      const date     = item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}) : 'Recently';
      const link     = item.permalink || '#';
      const likes    = item.like_count || 0;

      const showBranding = (this.source === 'story') 
        ? !this.config.stories.removeWatermark 
        : !this.config.postFeed.removeWatermark;
        
      const logoContent = this.config.logoUrl 
        ? '<img src="' + this.config.logoUrl + '" style="height:16px !important;width:auto !important;max-width:none !important;max-height:16px !important;vertical-align:middle !important;display:inline-block !important;margin-left:4px !important;" alt="BOOST STAR Experts" />'
        : 'BOOST STAR Experts';
      const watermarkHtml = showBranding ? '<div style="text-align:center;padding:12px 0 0;font-size:11px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;">' + logoContent + '</a></div>' : '';

      const prevBtn = hasPrev
        ? '<button class="ai-modal-nav-btn ai-modal-prev" aria-label="Previous post">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16l-5-5 5-5"/></svg>' +
          '</button>'
        : '';

      const nextBtn = hasNext
        ? '<button class="ai-modal-nav-btn ai-modal-next" aria-label="Next post">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 16l5-5-5-5"/></svg>' +
          '</button>'
        : '';

      const counterBadge = showNav
        ? '<div class="ai-modal-counter">' + (index + 1) + ' / ' + this.activeMedia.length + '</div>'
        : '';

      // Check if root already exists to avoid re-triggering entrance animations
      const existingRoot = this.shadowRoot.querySelector('#ai-instafeed-modal-root');
      if (existingRoot) {
        // Stop any existing video before updating
        existingRoot.querySelectorAll('video').forEach(v => {
          v.pause();
          v.src = '';
        });

        // 1. Update Media Pane
        const mediaPane = this.shadowRoot.querySelector('.ai-modal-media-pane');
        if (mediaPane) {
          mediaPane.innerHTML = mediaHtml + prevBtn + nextBtn + counterBadge;
        }

        // 2. Update Header Info
        const handleEl = this.shadowRoot.querySelector('.ai-modal-handle');
        if (handleEl) handleEl.textContent = '@' + handle;

        // 3. Update Body Info
        const captionHandleEl = this.shadowRoot.querySelector('.ai-modal-caption-handle');
        if (captionHandleEl) captionHandleEl.textContent = '@' + handle;

        const captionTextEl = this.shadowRoot.querySelector('.ai-modal-caption-text');
        if (captionTextEl) captionTextEl.innerHTML = caption;

        // 4. Update Footer Info
        const likesEl = this.shadowRoot.querySelector('.ai-modal-likes-count');
        if (likesEl) likesEl.textContent = likes;

        const dateEl = this.shadowRoot.querySelector('.ai-modal-date');
        if (dateEl) dateEl.textContent = date;

        const igBtn = this.shadowRoot.querySelector('.ai-modal-ig-btn');
        if (igBtn) igBtn.setAttribute('href', link);

        const watermarkWrap = this.shadowRoot.querySelector('.ai-modal-watermark-wrap');
        if (watermarkWrap) watermarkWrap.innerHTML = watermarkHtml;

      } else {
        // Render whole modal structure
        let styleLink = "";
        if (this.cssUrl) {
          styleLink = `<link rel="stylesheet" href="${this.cssUrl}">`;
        }

        this.shadowRoot.innerHTML =
          styleLink +
          '<div id="ai-instafeed-modal-root" style="display: flex;">' +
            '<div class="ai-modal-layout">' +
              '<div class="ai-modal-media-pane">' +
                mediaHtml +
                prevBtn +
                nextBtn +
                counterBadge +
              '</div>' +
              '<div class="ai-modal-info-pane">' +
                '<div class="ai-modal-header">' +
                  '<div class="ai-modal-avatar">' +
                    '<svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
                  '</div>' +
                  '<div class="ai-modal-handle-wrap">' +
                    '<div class="ai-modal-handle">@' + handle + '</div>' +
                    '<div class="ai-modal-sublabel">Instagram Feed</div>' +
                  '</div>' +
                  '<button class="ai-modal-header-close" aria-label="Close">' +
                    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#64748b" stroke-width="2"><path d="M15 5L5 15M5 5l10 10"/></svg>' +
                  '</button>' +
                '</div>' +
                '<div class="ai-modal-body">' +
                  '<p class="ai-modal-caption">' +
                    '<strong class="ai-modal-caption-handle">@' + handle + '</strong>' +
                    '<span class="ai-modal-caption-text">' + caption + '</span>' +
                  '</p>' +
                '</div>' +
                '<div class="ai-modal-footer">' +
                  '<div class="ai-modal-actions">' +
                    '<div class="ai-modal-actions-left">' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
                    '</div>' +
                    '<div class="ai-modal-actions-right">' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>' +
                    '</div>' +
                  '</div>' +
                  '<div class="ai-modal-likes-line">' +
                    '<span class="ai-modal-likes-count">' + likes + '</span> likes' +
                  '</div>' +
                  '<div class="ai-modal-date">' + date + '</div>' +
                  '<div style="margin-top:12px;">' +
                    '<a href="' + link + '" target="_blank" rel="noreferrer" class="ai-modal-ig-btn">View on Instagram</a>' +
                  '</div>' +
                  '<div class="ai-modal-watermark-wrap">' + watermarkHtml + '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
      this.bindSubCarouselEvents();
    }
  }

  if (!customElements.get("instafeed-grid")) {
    customElements.define("instafeed-grid", InstafeedGrid);
  }
  if (!customElements.get("instafeed-story")) {
    customElements.define("instafeed-story", InstafeedStory);
  }
  if (!customElements.get("instafeed-modal")) {
    customElements.define("instafeed-modal", InstafeedModal);
  }

  // ── Global event listener for modal opening ────────────────────────────────
  document.addEventListener("instafeed:open-modal", (e) => {
    let modalEl = document.querySelector("instafeed-modal");
    if (!modalEl) {
      modalEl = document.createElement("instafeed-modal");
      document.body.appendChild(modalEl);
    }
    const gridEl = document.querySelector("instafeed-grid");
    const storyEl = document.querySelector("instafeed-story");
    const logoUrl = (gridEl && gridEl.getAttribute("data-logo-url")) || (storyEl && storyEl.getAttribute("data-logo-url")) || "";
    e.detail.config.logoUrl = logoUrl;

    const cssUrl = e.detail.cssUrl || (gridEl && gridEl.getAttribute("css-url")) || (storyEl && storyEl.getAttribute("css-url")) || getCssUrl();

    modalEl.open(e.detail.id, e.detail.source, e.detail.media, e.detail.config, cssUrl);
  });

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async function init() {
    console.log("[AI Instafeed] Initializing...");
    const grids = document.querySelectorAll("instafeed-grid");
    const stories = document.querySelectorAll("instafeed-story");

    if (grids.length === 0 && stories.length === 0) {
      console.log("[AI Instafeed] No custom elements found on this page.");
    }

    // Check if initial payload was pre-rendered by Liquid block
    let loadedFromPayload = false;
    const initialScript = document.querySelector(".ai-instafeed-initial-data");
    if (initialScript) {
      try {
        const initial = JSON.parse(initialScript.textContent);
        if (initial && initial.config) {
          console.log("[AI Instafeed] Loaded initial data from pre-rendered Liquid payload.");
          applyDataAndRender(initial.config, initial.instaData);
          loadedFromPayload = true;
        }
      } catch (e) {
        console.warn("[AI Instafeed] Could not parse initial Liquid payload:", e);
      }
    }

    // If no pre-rendered payload was rendered, fetch from proxy
    if (!loadedFromPayload) {
      await loadAndRender();
    }

    // Re-bind on theme editor events
    document.addEventListener("shopify:section:load", () => {
      console.log("[AI Instafeed] Section load detected");
      loadAndRender();
    });

    // Polling restricted to Shopify Theme Editor (designMode) for live preview updates
    if (window.Shopify && window.Shopify.designMode) {
      console.log("[AI Instafeed] Theme editor detected - enabling live 30s preview polling.");
      setInterval(async () => {
        await loadAndRender();
      }, POLL_INTERVAL);
    }

    let lastIsMobile = window.innerWidth <= 768;
    window.addEventListener("resize", () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile !== lastIsMobile) {
        lastIsMobile = isMobile;
        document.querySelectorAll("instafeed-grid").forEach(grid => {
          if (grid.config && grid.mediaData) {
            grid.render(grid.config, grid.mediaData);
          }
        });
        document.querySelectorAll("instafeed-story").forEach(story => {
          if (story.config && story.mediaData) {
            story.render(story.config, story.mediaData);
          }
        });
      }
    });
  }

  function applyDataAndRender(config, instaData) {
    const grids = document.querySelectorAll("instafeed-grid");
    const stories = document.querySelectorAll("instafeed-story");

    if (!config) {
      console.warn("[AI Instafeed] No config available to render.");
      return;
    }

    let mediaData = instaData?.media?.data || [];
    
    if (config.postFeed?.hiddenPostIds?.length > 0) {
      mediaData = mediaData.filter(item => !config.postFeed.hiddenPostIds.includes(item.id || item.media_url));
    }

    let gridMedia = mediaData;
    let storyMedia = mediaData;

    // Filter gridMedia by grid mediaTypeFilter
    const gridFilter = config.postFeed?.mediaTypeFilter || "all";
    if (gridFilter === "images") {
      gridMedia = gridMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return !isVideo;
      });
    } else if (gridFilter === "videos") {
      gridMedia = gridMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return isVideo;
      });
    }
    if (config.postFeed?.sortBy === "engaging") {
      const getEngagement = (item) => (item.like_count || 0) + (item.comments_count || 0);
      gridMedia = [...gridMedia].sort((a, b) => getEngagement(b) - getEngagement(a));
    }

    // Filter storyMedia by story mediaTypeFilter
    const storyFilter = config.stories?.mediaTypeFilter || "all";
    if (storyFilter === "images") {
      storyMedia = storyMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return !isVideo;
      });
    } else if (storyFilter === "videos") {
      storyMedia = storyMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return isVideo;
      });
    }
    if (config.stories?.sortBy === "engaging") {
      const getEngagement = (item) => (item.like_count || 0) + (item.comments_count || 0);
      storyMedia = [...storyMedia].sort((a, b) => getEngagement(b) - getEngagement(a));
    }

    cachedConfig = config;
    cachedGridMedia = gridMedia;
    cachedStoryMedia = storyMedia;

    // Update active components
    grids.forEach(grid => grid.render(config, gridMedia));
    stories.forEach(story => story.render(config, storyMedia));
  }

  async function loadAndRender() {
    try {
      console.log("[AI Instafeed] Fetching data from:", PROXY_URL);
      const res = await fetch(PROXY_URL, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[AI Instafeed] Proxy error:", res.status, text.slice(0, 100));
        throw new Error("Proxy returned " + res.status);
      }

      const json = await res.json();
      console.log("[AI Instafeed] Data received:", json ? "Success" : "Empty");

      if (json.error) throw new Error(json.error);

      const { config, instaData } = json;
      applyDataAndRender(config, instaData);
      
    } catch (err) {
      console.warn("[AI Instafeed] Could not load data:", err.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
