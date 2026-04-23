import './style.css';
import { setupUploader } from './modules/upload.js';
import { removePhotoBackground } from './modules/removeBackground.js';
import {
  appState,
  resetResult,
  setComposedPhotoBlob,
  setOriginalImage,
  setRemovedBackgroundImage,
  setSelectedColor,
  setSelectedSize,
} from './modules/state.js';
import { PHOTO_SIZES, getPhotoSizeByKey } from './modules/sizes.js';
import {
  PHOTO_BACKGROUND_COLORS,
  createComposedPhotoBlob,
  getPhotoColorByKey,
  renderComposedPhotoToCanvas,
} from './modules/compose.js';
import { createDownloadFileName, downloadBlob } from './modules/download.js';

const app = document.querySelector('#app');

function createColorButtons() {
  return PHOTO_BACKGROUND_COLORS.map((color) => {
    const style =
      color.type === 'gradient'
        ? `background: linear-gradient(180deg, ${color.from}, ${color.to});`
        : `background: ${color.value};`;

    return `
      <button
        class="color-swatch"
        type="button"
        data-color-key="${color.key}"
        aria-label="选择${color.label}底色"
        title="${color.label}"
        style="${style}"
      ></button>
    `;
  }).join('');
}

function createSizeCards() {
  return PHOTO_SIZES.map((size) => `
    <button class="size-card" type="button" data-size-key="${size.key}">
      <strong>${size.label}</strong>
      <span>${size.widthMm}×${size.heightMm} mm</span>
      <span>${size.widthPx}×${size.heightPx} px</span>
    </button>
  `).join('');
}

app.innerHTML = `
  <main class="app-shell">
    <header class="hero">
      <p class="eyebrow">Browser-only ID Photo Tool</p>
      <h1>证件照工作室</h1>
      <p class="subtitle">完全本地处理，照片不会离开你的设备</p>
    </header>

    <section class="studio-card" aria-label="证件照处理区">
      <div class="upload-panel">
        <label id="uploadDropzone" class="upload-dropzone" for="photoInput">
          <input id="photoInput" type="file" accept="image/*" />
          <span class="upload-icon" aria-hidden="true">+</span>
          <span class="upload-title">拖拽照片到此处，或点击选择</span>
          <span class="upload-hint">支持 JPG、PNG、WebP 等常见图片格式</span>
        </label>
      </div>

      <p id="message" class="message" role="status" aria-live="polite"></p>

      <div id="previewGrid" class="preview-grid is-hidden">
        <article class="preview-card">
          <div class="preview-card__header">
            <h2>原图预览</h2>
            <span id="fileMeta" class="file-meta"></span>
          </div>
          <div class="preview-frame">
            <canvas id="originalCanvas" aria-label="原图预览"></canvas>
          </div>
          <button id="removeButton" class="primary-button" type="button">开始抠图</button>
        </article>

        <article id="resultCard" class="preview-card result-card is-hidden">
          <div class="preview-card__header">
            <h2>抠图结果</h2>
            <span class="file-meta">透明背景</span>
          </div>
          <div class="preview-frame checkerboard">
            <canvas id="resultCanvas" aria-label="抠图结果预览"></canvas>
          </div>
        </article>
      </div>

      <div id="loading" class="loading is-hidden" aria-live="assertive">
        <span class="spinner" aria-hidden="true"></span>
        <span>AI 抠图中，首次使用需要下载模型约 40MB</span>
      </div>

      <section id="composePanel" class="compose-panel is-hidden" aria-label="排版设置">
        <div class="compose-settings">
          <div class="section-heading">
            <p class="eyebrow compact">Layout</p>
            <h2>排版设置</h2>
            <p>选择证件照尺寸和背景色，右侧会实时生成成品预览。</p>
          </div>

          <div class="setting-group">
            <h3>底色选择</h3>
            <div id="colorOptions" class="color-options">
              ${createColorButtons()}
            </div>
          </div>

          <div class="setting-group">
            <h3>尺寸选择</h3>
            <div id="sizeOptions" class="size-options">
              ${createSizeCards()}
            </div>
          </div>
        </div>

        <aside class="final-preview-card">
          <div class="preview-card__header">
            <h2>成品预览</h2>
            <span id="finalMeta" class="file-meta"></span>
          </div>
          <div class="final-preview-frame">
            <canvas id="finalCanvas" aria-label="证件照成品预览"></canvas>
          </div>
          <button id="downloadButton" class="primary-button download-button" type="button">
            下载当前照片
          </button>
        </aside>
      </section>
    </section>
  </main>
`;

const elements = {
  uploadDropzone: document.querySelector('#uploadDropzone'),
  photoInput: document.querySelector('#photoInput'),
  message: document.querySelector('#message'),
  previewGrid: document.querySelector('#previewGrid'),
  fileMeta: document.querySelector('#fileMeta'),
  originalCanvas: document.querySelector('#originalCanvas'),
  removeButton: document.querySelector('#removeButton'),
  resultCard: document.querySelector('#resultCard'),
  resultCanvas: document.querySelector('#resultCanvas'),
  loading: document.querySelector('#loading'),
  composePanel: document.querySelector('#composePanel'),
  colorOptions: document.querySelector('#colorOptions'),
  sizeOptions: document.querySelector('#sizeOptions'),
  finalCanvas: document.querySelector('#finalCanvas'),
  finalMeta: document.querySelector('#finalMeta'),
  downloadButton: document.querySelector('#downloadButton'),
};

let composePreviewTimer = null;
let composeRenderVersion = 0;

// 统一的用户提示出口，避免多个模块直接操作提示文案。
function showMessage(text, type = 'info') {
  elements.message.textContent = text;
  elements.message.dataset.type = type;
  elements.message.classList.toggle('is-hidden', !text);
}

// 将 ImageBitmap 绘制到 canvas，并限制页面显示尺寸不超过 400px。
function drawBitmapToCanvas(canvas, bitmap) {
  const maxPreviewSize = 400;
  const ratio = Math.min(maxPreviewSize / bitmap.width, maxPreviewSize / bitmap.height, 1);
  const displayWidth = Math.round(bitmap.width * ratio);
  const displayHeight = Math.round(bitmap.height * ratio);
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(displayWidth * pixelRatio);
  canvas.height = Math.round(displayHeight * pixelRatio);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const context = canvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);
  context.drawImage(bitmap, 0, 0, displayWidth, displayHeight);
}

function setLoading(isLoading) {
  elements.loading.classList.toggle('is-hidden', !isLoading);
  elements.removeButton.disabled = isLoading;
  elements.uploadDropzone.classList.toggle('is-disabled', isLoading);
}

function getSelectedSize() {
  return getPhotoSizeByKey(appState.selectedSizeKey);
}

function getSelectedColor() {
  return getPhotoColorByKey(appState.selectedColorKey);
}

function syncSelectedControls() {
  elements.colorOptions.querySelectorAll('.color-swatch').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.colorKey === appState.selectedColorKey);
  });

  elements.sizeOptions.querySelectorAll('.size-card').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.sizeKey === appState.selectedSizeKey);
  });
}

async function renderComposedPreview() {
  if (!appState.removedBackgroundImageBitmap) {
    return;
  }

  const renderVersion = (composeRenderVersion += 1);
  const selectedSize = getSelectedSize();
  const selectedColor = getSelectedColor();

  try {
    // 屏幕预览按 0.5 倍绘制，导出时再生成完整像素尺寸。
    renderComposedPhotoToCanvas(
      elements.finalCanvas,
      appState.removedBackgroundImageBitmap,
      selectedSize,
      selectedColor,
      0.5,
    );

    elements.finalMeta.textContent = `${selectedSize.widthPx}×${selectedSize.heightPx} px`;
    elements.downloadButton.disabled = true;

    const blob = await createComposedPhotoBlob(
      appState.removedBackgroundImageBitmap,
      selectedSize,
      selectedColor,
    );

    // 防止快速切换时，较早的异步导出覆盖最新状态。
    if (renderVersion === composeRenderVersion) {
      setComposedPhotoBlob(blob);
      elements.downloadButton.disabled = false;
    }
  } catch (error) {
    console.error('成品预览生成失败：', error);
    showMessage('成品预览生成失败，请重新选择底色或尺寸再试。', 'error');
    elements.downloadButton.disabled = false;
  }
}

function scheduleComposedPreviewRender() {
  window.clearTimeout(composePreviewTimer);

  // 切换底色或尺寸时防抖，避免连续点击造成频繁重绘。
  composePreviewTimer = window.setTimeout(() => {
    renderComposedPreview();
  }, 300);
}

async function handlePhotoSelected(file) {
  try {
    resetResult();
    showMessage('');
    elements.resultCard.classList.add('is-hidden');
    elements.composePanel.classList.add('is-hidden');
    elements.downloadButton.disabled = true;

    // createImageBitmap 会在浏览器本地解码图片，不会产生网络上传。
    const imageBitmap = await createImageBitmap(file);
    setOriginalImage(file, imageBitmap);

    drawBitmapToCanvas(elements.originalCanvas, imageBitmap);
    elements.fileMeta.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;
    elements.previewGrid.classList.remove('is-hidden');
  } catch (error) {
    console.error('图片读取失败：', error);
    showMessage('图片读取失败，请换一张清晰的 JPG、PNG 或 WebP 图片再试。', 'error');
  }
}

async function handleRemoveBackground() {
  if (!appState.originalFile) {
    showMessage('请先上传一张照片，再开始抠图。', 'error');
    return;
  }

  try {
    setLoading(true);
    showMessage('');
    elements.composePanel.classList.add('is-hidden');

    const resultBitmap = await removePhotoBackground(appState.originalFile);
    setRemovedBackgroundImage(resultBitmap);

    drawBitmapToCanvas(elements.resultCanvas, resultBitmap);
    elements.resultCard.classList.remove('is-hidden');
    elements.composePanel.classList.remove('is-hidden');
    syncSelectedControls();
    await renderComposedPreview();
    showMessage('抠图完成，已生成默认成品预览。', 'success');
  } catch (error) {
    console.error('抠图失败：', error);
    showMessage('抠图失败。请检查网络是否能下载首次模型，或换一张主体更清晰的照片再试。', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleDownload() {
  if (!appState.removedBackgroundImageBitmap) {
    showMessage('请先完成抠图，再下载证件照。', 'error');
    return;
  }

  const selectedSize = getSelectedSize();
  const selectedColor = getSelectedColor();

  try {
    elements.downloadButton.disabled = true;

    // 如果当前预览 Blob 不存在，则下载前补一次完整尺寸导出。
    const blob =
      appState.composedPhotoBlob ||
      (await createComposedPhotoBlob(
        appState.removedBackgroundImageBitmap,
        selectedSize,
        selectedColor,
      ));

    setComposedPhotoBlob(blob);
    downloadBlob(blob, createDownloadFileName(selectedSize, selectedColor));
    showMessage('下载已开始，文件会保存为当前尺寸和底色的 JPG。', 'success');
  } catch (error) {
    console.error('下载失败：', error);
    showMessage('下载失败，请稍后重试，或更换浏览器再试。', 'error');
  } finally {
    elements.downloadButton.disabled = false;
  }
}

setupUploader({
  inputElement: elements.photoInput,
  dropzoneElement: elements.uploadDropzone,
  onFileSelected: handlePhotoSelected,
  onError: (message) => showMessage(message, 'error'),
});

elements.removeButton.addEventListener('click', handleRemoveBackground);
elements.downloadButton.addEventListener('click', handleDownload);

elements.colorOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-color-key]');

  if (!button) {
    return;
  }

  setSelectedColor(button.dataset.colorKey);
  syncSelectedControls();
  scheduleComposedPreviewRender();
});

elements.sizeOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-size-key]');

  if (!button) {
    return;
  }

  setSelectedSize(button.dataset.sizeKey);
  syncSelectedControls();
  scheduleComposedPreviewRender();
});

syncSelectedControls();
