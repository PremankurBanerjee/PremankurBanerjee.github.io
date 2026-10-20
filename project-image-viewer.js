(() => {
  const thumbnails = document.querySelectorAll('.projects-showcase .project-media img');
  if (!thumbnails.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'project-image-viewer';
  dialog.id = 'project-image-viewer';
  dialog.setAttribute('aria-labelledby', 'project-image-viewer-title');
  dialog.innerHTML = `
    <div class="project-image-viewer__header">
      <h2 id="project-image-viewer-title">Image viewer</h2>
      <button type="button" data-action="close" aria-label="Close image viewer" autofocus>Close &times;</button>
    </div>
    <div class="project-image-viewer__viewport" tabindex="0" role="region"
         aria-label="Image. Use plus and minus to zoom, arrow keys to pan, and zero to fit."
         aria-describedby="project-image-viewer-caption">
      <img class="project-image-viewer__image" alt="" draggable="false" hidden>
      <p class="project-image-viewer__status" role="status">Loading image…</p>
    </div>
    <div class="project-image-viewer__footer">
      <div class="project-image-viewer__controls" role="group" aria-label="Image zoom">
        <button type="button" data-action="out" aria-label="Zoom out">&minus;</button>
        <output class="project-image-viewer__zoom" aria-label="Zoom relative to fitted image">100%</output>
        <button type="button" data-action="in" aria-label="Zoom in">+</button>
        <button type="button" data-action="fit">Fit image</button>
      </div>
      <p class="project-image-viewer__caption" id="project-image-viewer-caption"></p>
      <p class="project-image-viewer__hint">Scroll or pinch to zoom · Drag to explore · Esc to close</p>
    </div>`;
  document.body.append(dialog);

  const viewport = dialog.querySelector('.project-image-viewer__viewport');
  const image = dialog.querySelector('img');
  const status = dialog.querySelector('[role="status"]');
  const caption = dialog.querySelector('.project-image-viewer__caption');
  const zoomLabel = dialog.querySelector('output');
  const zoomIn = dialog.querySelector('[data-action="in"]');
  const zoomOut = dialog.querySelector('[data-action="out"]');
  const fitButton = dialog.querySelector('[data-action="fit"]');
  const pointers = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let zoom = 1;
  let x = 0;
  let y = 0;
  let ready = false;
  let opener;

  function render() {
    zoomLabel.value = `${Math.round(zoom * 100)}%`;
    zoomIn.disabled = !ready || zoom >= 5;
    zoomOut.disabled = !ready || zoom <= 1;
    fitButton.disabled = !ready;
    viewport.classList.toggle('is-zoomed', ready && zoom > 1);
    if (!ready || !dialog.open) return;

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const fit = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = image.naturalWidth * fit * zoom;
    const imageHeight = image.naturalHeight * fit * zoom;
    const limitX = Math.max(0, (imageWidth - width) / 2);
    const limitY = Math.max(0, (imageHeight - height) / 2);
    x = clamp(x, -limitX, limitX);
    y = clamp(y, -limitY, limitY);
    image.style.width = `${imageWidth}px`;
    image.style.height = `${imageHeight}px`;
    image.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  function setZoom(value, clientX, clientY) {
    if (!ready) return;
    const next = clamp(value, 1, 5);
    const bounds = viewport.getBoundingClientRect();
    const anchorX = clientX === undefined ? 0 : clientX - bounds.left - bounds.width / 2;
    const anchorY = clientY === undefined ? 0 : clientY - bounds.top - bounds.height / 2;
    x = anchorX - (anchorX - x) * next / zoom;
    y = anchorY - (anchorY - y) * next / zoom;
    zoom = next;
    render();
  }

  function fitImage() {
    zoom = 1;
    x = y = 0;
    render();
  }

  function onLoad() {
    if (!dialog.open || !image.naturalWidth) return;
    ready = true;
    status.hidden = true;
    image.hidden = false;
    fitImage();
  }

  image.addEventListener('load', onLoad);
  image.addEventListener('error', () => {
    ready = false;
    image.hidden = true;
    status.textContent = 'This image could not be loaded. Please close the viewer and try again.';
    status.hidden = false;
    render();
  });

  function openImage(thumbnail, button, description) {
    opener = button;
    ready = false;
    image.hidden = true;
    status.textContent = 'Loading image…';
    status.hidden = false;
    image.alt = thumbnail.alt.trim() || description;
    caption.textContent = description;
    document.documentElement.classList.add('project-image-viewer-open');
    document.body.classList.add('project-image-viewer-open');
    dialog.showModal();
    fitImage();
    image.src = thumbnail.dataset.fullSrc || thumbnail.currentSrc || thumbnail.src;
    if (image.complete && image.naturalWidth) onLoad();
  }

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  zoomIn.addEventListener('click', () => setZoom(zoom * 1.25));
  zoomOut.addEventListener('click', () => setZoom(zoom / 1.25));
  fitButton.addEventListener('click', fitImage);
  dialog.addEventListener('close', () => {
    pointers.clear();
    viewport.classList.remove('is-dragging');
    document.documentElement.classList.remove('project-image-viewer-open');
    document.body.classList.remove('project-image-viewer-open');
    opener?.focus({ preventScroll: true });
  });

  // Only a click that starts and ends on the backdrop dismisses the viewer.
  let backdropPressed = false;
  const outsideDialog = event => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => {
    backdropPressed = event.target === dialog && outsideDialog(event);
  });
  dialog.addEventListener('click', event => {
    if (backdropPressed && event.target === dialog && outsideDialog(event)) dialog.close();
    backdropPressed = false;
  });

  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    setZoom(zoom * Math.exp(-clamp(delta, -120, 120) * 0.002), event.clientX, event.clientY);
  }, { passive: false });

  viewport.addEventListener('dblclick', event => {
    if (zoom > 1) fitImage();
    else setZoom(2, event.clientX, event.clientY);
  });

  viewport.addEventListener('pointerdown', event => {
    if (!ready || event.button !== 0) return;
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });

  viewport.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const before = Array.from(pointers.values());
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = Array.from(pointers.values());
    if (before.length === 2) {
      const distance = points => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const oldDistance = distance(before);
      const oldX = (before[0].x + before[1].x) / 2;
      const oldY = (before[0].y + before[1].y) / 2;
      if (oldDistance > 0) setZoom(zoom * distance(after) / oldDistance, oldX, oldY);
      x += (after[0].x + after[1].x) / 2 - oldX;
      y += (after[0].y + after[1].y) / 2 - oldY;
    } else if (before.length === 1) {
      x += event.clientX - previous.x;
      y += event.clientY - previous.y;
    }
    render();
  });

  function releasePointer(event) {
    pointers.delete(event.pointerId);
    if (!pointers.size) viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', releasePointer);
  viewport.addEventListener('pointercancel', releasePointer);
  viewport.addEventListener('lostpointercapture', releasePointer);

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const focusable = dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') setZoom(zoom * 1.25);
    else if (event.key === '-') setZoom(zoom / 1.25);
    else if (event.key === '0') fitImage();
    else if (event.target === viewport && event.key.startsWith('Arrow')) {
      if (event.key === 'ArrowLeft') x += 50;
      if (event.key === 'ArrowRight') x -= 50;
      if (event.key === 'ArrowUp') y += 50;
      if (event.key === 'ArrowDown') y -= 50;
      render();
    } else return;
    event.preventDefault();
  });

  new ResizeObserver(render).observe(viewport);

  thumbnails.forEach(thumbnail => {
    const media = thumbnail.closest('.project-media');
    const heading = thumbnail.closest('.project-part')?.querySelector('h3')?.textContent;
    const description = (heading || thumbnail.alt || 'Project image').replace(/\s+/g, ' ').trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-image-expand';
    button.setAttribute('aria-label', `View full image: ${description}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg><span>View full image</span>`;
    media.classList.add('has-image-viewer');
    media.append(button);
    thumbnail.draggable = false;
    thumbnail.title = 'Click to view the full image, or drag to move the crop';
    button.addEventListener('click', () => openImage(thumbnail, button, description));

    let drag;
    let moved = false;
    let positionX = 50;
    let positionY = 50;
    thumbnail.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary || !thumbnail.naturalWidth) return;
      const scale = Math.max(thumbnail.clientWidth / thumbnail.naturalWidth, thumbnail.clientHeight / thumbnail.naturalHeight);
      drag = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        positionX, positionY,
        overflowX: thumbnail.naturalWidth * scale - thumbnail.clientWidth,
        overflowY: thumbnail.naturalHeight * scale - thumbnail.clientHeight
      };
      moved = false;
      thumbnail.setPointerCapture(event.pointerId);
    });
    thumbnail.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      media.classList.add('is-panning');
      if (drag.overflowX > 1) positionX = clamp(drag.positionX - dx / drag.overflowX * 100, 0, 100);
      if (drag.overflowY > 1) positionY = clamp(drag.positionY - dy / drag.overflowY * 100, 0, 100);
      thumbnail.style.objectPosition = `${positionX}% ${positionY}%`;
      event.stopPropagation();
    });
    const endDrag = () => {
      drag = null;
      media.classList.remove('is-panning');
    };
    thumbnail.addEventListener('pointerup', endDrag);
    thumbnail.addEventListener('pointercancel', endDrag);
    thumbnail.addEventListener('lostpointercapture', endDrag);
    thumbnail.addEventListener('click', event => {
      if (moved) {
        event.preventDefault();
        return;
      }
      openImage(thumbnail, button, description);
    });
  });
})();
