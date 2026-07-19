// Billy the Hood Dog — Mask / PFP Generator
// Upload a photo, pick a mask, drag to move it, drag the green corner
// handle (or use the slider) to resize it, drag the yellow top handle
// (or use the slider) to rotate it, then download a PNG.
// Everything happens locally in the browser — nothing is uploaded anywhere.

(function () {
  const canvas = document.getElementById('pfp-canvas');
  if (!canvas) return; // section not on this page

  const ctx = canvas.getContext('2d');
  const photoInput = document.getElementById('photoInput');
  const resetBtn = document.getElementById('resetBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const scaleRange = document.getElementById('scaleRange');
  const scaleValueLabel = document.getElementById('scaleValue');
  const rotateRange = document.getElementById('rotateRange');
  const rotateValueLabel = document.getElementById('rotateValue');
  const maskThumbs = document.querySelectorAll('.mask-thumb');
  const hintEl = document.getElementById('canvasHint');

  const RESIZE_HANDLE_RADIUS = 9;
  const ROTATE_HANDLE_RADIUS = 8;
  const HANDLE_HIT_PADDING = 14;
  const ROTATE_OFFSET = 42; // px above the mask's top edge, in local space

  let baseImg = null; // uploaded photo
  let maskImg = null; // current mask Image object
  // maskState describes the mask's unrotated bounding box (x, y, w, h)
  // plus a rotation (radians) applied around the box's own center.
  let maskState = { x: 0, y: 0, w: 0, h: 0, rot: 0 };
  let baselineW = 0;
  let baselineH = 0;
  const maskCache = {};

  let dragMode = null; // 'move' | 'resize' | 'rotate' | null
  let dragStart = { x: 0, y: 0 };
  let stateStart = { x: 0, y: 0, w: 0, h: 0, rot: 0 };
  let dragStartAngle = 0;

  function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  function maskCenter() {
    return {
      x: maskState.x + maskState.w / 2,
      y: maskState.y + maskState.h / 2,
    };
  }

  // Rotate a point (px, py) that lives in the mask's local (unrotated)
  // space out into canvas/world space, around the mask's center.
  function localToWorld(px, py) {
    const c = maskCenter();
    const cos = Math.cos(maskState.rot);
    const sin = Math.sin(maskState.rot);
    const dx = px - c.x;
    const dy = py - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }

  // Inverse of localToWorld — bring a world/canvas point into the mask's
  // local (unrotated) space so hit-testing can use simple axis-aligned math.
  function worldToLocal(wx, wy) {
    const c = maskCenter();
    const cos = Math.cos(-maskState.rot);
    const sin = Math.sin(-maskState.rot);
    const dx = wx - c.x;
    const dy = wy - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }

  function drawImageCover(context, img, dx, dy, dWidth, dHeight) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(dWidth / iw, dHeight / ih);
    const sw = dWidth / scale;
    const sh = dHeight / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    context.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
  }

  function setDefaultMaskState() {
    if (!maskImg) return;
    const iw = maskImg.naturalWidth || 300;
    const ih = maskImg.naturalHeight || 220;
    const targetW = canvas.width * 0.62;
    const targetH = targetW * (ih / iw);
    baselineW = targetW;
    baselineH = targetH;
    maskState = {
      x: (canvas.width - targetW) / 2,
      y: (canvas.height - targetH) / 2 - canvas.height * 0.02,
      w: targetW,
      h: targetH,
      rot: 0,
    };
    if (scaleRange) scaleRange.value = 100;
    if (scaleValueLabel) scaleValueLabel.textContent = '100%';
    if (rotateRange) rotateRange.value = 0;
    if (rotateValueLabel) rotateValueLabel.textContent = '0°';
  }

  function loadMask(src) {
    if (maskCache[src]) {
      maskImg = maskCache[src];
      setDefaultMaskState();
      draw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      maskCache[src] = img;
      maskImg = img;
      setDefaultMaskState();
      draw();
    };
    img.onerror = () => flashHint('Maske konnte nicht geladen werden.');
    img.src = src;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (baseImg) {
      drawImageCover(ctx, baseImg, 0, 0, canvas.width, canvas.height);
    } else {
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 40,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.2
      );
      grad.addColorStop(0, '#161c13');
      grad.addColorStop(1, '#050704');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(234,240,228,0.4)';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Foto hochladen, um zu starten', canvas.width / 2, canvas.height - 46);
    }

    if (maskImg) {
      const c = maskCenter();

      // draw the mask rotated around its own center
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(maskState.rot);
      ctx.drawImage(maskImg, -maskState.w / 2, -maskState.h / 2, maskState.w, maskState.h);
      ctx.restore();

      // resize handle (bottom-right corner, in world space)
      const resizeHandle = localToWorld(maskState.x + maskState.w, maskState.y + maskState.h);
      drawHandle(resizeHandle.x, resizeHandle.y, RESIZE_HANDLE_RADIUS, '#8cff3b');

      // rotate handle (above the top-center, in world space) + connector line
      const rotateAnchor = localToWorld(maskState.x + maskState.w / 2, maskState.y);
      const rotateHandle = localToWorld(maskState.x + maskState.w / 2, maskState.y - ROTATE_OFFSET);
      ctx.beginPath();
      ctx.moveTo(rotateAnchor.x, rotateAnchor.y);
      ctx.lineTo(rotateHandle.x, rotateHandle.y);
      ctx.strokeStyle = 'rgba(255,210,63,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawHandle(rotateHandle.x, rotateHandle.y, ROTATE_HANDLE_RADIUS, '#ffd23f');
    }
  }

  function drawHandle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0b0f0a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function flashHint(msg) {
    if (!hintEl) return;
    if (!hintEl.dataset.original) hintEl.dataset.original = hintEl.textContent;
    hintEl.textContent = msg;
    hintEl.style.color = '#ffd23f';
    clearTimeout(flashHint._t);
    flashHint._t = setTimeout(() => {
      hintEl.textContent = hintEl.dataset.original;
      hintEl.style.color = '';
    }, 2600);
  }

  // ---- photo upload ----
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      flashHint('Bitte eine Bilddatei auswählen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        baseImg = img;
        draw();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ---- mask picker ----
  maskThumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      maskThumbs.forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      loadMask(thumb.dataset.mask);
    });
  });

  // ---- reset ----
  resetBtn?.addEventListener('click', () => {
    setDefaultMaskState();
    draw();
  });

  // ---- scale slider ----
  scaleRange?.addEventListener('input', () => {
    const val = parseInt(scaleRange.value, 10);
    if (scaleValueLabel) scaleValueLabel.textContent = val + '%';
    if (!maskImg || !baselineW) return;
    const c = maskCenter();
    const newW = baselineW * (val / 100);
    const newH = baselineH * (val / 100);
    maskState.w = newW;
    maskState.h = newH;
    maskState.x = c.x - newW / 2;
    maskState.y = c.y - newH / 2;
    draw();
  });

  // ---- rotate slider ----
  rotateRange?.addEventListener('input', () => {
    const deg = parseInt(rotateRange.value, 10);
    if (rotateValueLabel) rotateValueLabel.textContent = deg + '°';
    if (!maskImg) return;
    maskState.rot = (deg * Math.PI) / 180;
    draw();
  });

  function syncRotateControls() {
    let deg = Math.round((maskState.rot * 180) / Math.PI);
    // normalize into [-180, 180] to match the slider range
    deg = ((deg + 180) % 360 + 360) % 360 - 180;
    if (rotateRange) rotateRange.value = deg;
    if (rotateValueLabel) rotateValueLabel.textContent = deg + '°';
  }

  function syncScaleControls() {
    if (!baselineW) return;
    const pct = Math.round((maskState.w / baselineW) * 100);
    const clamped = Math.min(300, Math.max(20, pct));
    if (scaleRange) scaleRange.value = clamped;
    if (scaleValueLabel) scaleValueLabel.textContent = clamped + '%';
  }

  // ---- drag to move / resize / rotate on the canvas itself ----
  canvas.addEventListener('pointerdown', (e) => {
    if (!maskImg) return;
    const pos = getCanvasPos(e);

    const resizeHandle = localToWorld(maskState.x + maskState.w, maskState.y + maskState.h);
    const rotateHandle = localToWorld(maskState.x + maskState.w / 2, maskState.y - ROTATE_OFFSET);

    const distToResize = Math.hypot(pos.x - resizeHandle.x, pos.y - resizeHandle.y);
    const distToRotate = Math.hypot(pos.x - rotateHandle.x, pos.y - rotateHandle.y);

    if (distToRotate <= ROTATE_HANDLE_RADIUS + HANDLE_HIT_PADDING) {
      dragMode = 'rotate';
      const c = maskCenter();
      dragStartAngle = Math.atan2(pos.y - c.y, pos.x - c.x);
    } else if (distToResize <= RESIZE_HANDLE_RADIUS + HANDLE_HIT_PADDING) {
      dragMode = 'resize';
    } else {
      const local = worldToLocal(pos.x, pos.y);
      if (
        local.x >= maskState.x && local.x <= maskState.x + maskState.w &&
        local.y >= maskState.y && local.y <= maskState.y + maskState.h
      ) {
        dragMode = 'move';
      } else {
        return;
      }
    }

    dragStart = pos;
    stateStart = { ...maskState };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragMode) return;
    const pos = getCanvasPos(e);

    if (dragMode === 'move') {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      maskState.x = stateStart.x + dx;
      maskState.y = stateStart.y + dy;
    } else if (dragMode === 'resize') {
      // work in the mask's local (unrotated) space so resizing feels
      // natural no matter how far the mask has been rotated
      const local = worldToLocal(pos.x, pos.y);
      const ratio = stateStart.h / stateStart.w;
      const newW = Math.max(30, local.x - stateStart.x);
      const newH = newW * ratio;
      const c = { x: stateStart.x + stateStart.w / 2, y: stateStart.y + stateStart.h / 2 };
      maskState.w = newW;
      maskState.h = newH;
      maskState.x = c.x - newW / 2;
      maskState.y = c.y - newH / 2;
      syncScaleControls();
    } else if (dragMode === 'rotate') {
      const c = maskCenter();
      const currentAngle = Math.atan2(pos.y - c.y, pos.x - c.x);
      const delta = currentAngle - dragStartAngle;
      maskState.rot = stateStart.rot + delta;
      syncRotateControls();
    }

    draw();
  });

  function endDrag() {
    dragMode = null;
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // ---- download ----
  downloadBtn?.addEventListener('click', () => {
    if (!baseImg) {
      flashHint('Bitte zuerst ein Foto hochladen, dann dein PFP herunterladen.');
      return;
    }
    const link = document.createElement('a');
    link.download = 'billy-hood-dog-pfp.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ---- initial mask ----
  const initialThumb = document.querySelector('.mask-thumb.active') || maskThumbs[0];
  if (initialThumb) loadMask(initialThumb.dataset.mask);
  else draw();
})();
