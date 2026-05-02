import './style.css';
import { setupUploader } from './modules/upload.js';
import { removePhotoBackground } from './modules/removeBackground.js';
import {
  appState,
  clearSelectedTemplate,
  resetResult,
  setComposedPhotoBlob,
  setCompressionMode,
  setCustomSizeUnit,
  setCustomSizeValue,
  setOriginalCompressedBlob,
  setOriginalImage,
  setRemovedBackgroundImage,
  setSelectedColor,
  setSelectedCompression,
  setSelectedLimitKb,
  setSelectedSize,
  setSelectedTemplate,
} from './modules/state.js';
import {
  PHOTO_SIZES,
  buildCustomPhotoSize,
  getPhotoSizeByKey,
} from './modules/sizes.js';
import {
  PHOTO_BACKGROUND_COLORS,
  createComposedPhotoCanvas,
  getPhotoColorByKey,
  renderComposedPhotoToCanvas,
} from './modules/compose.js';
import {
  COMPRESSION_PRESETS,
  FILE_SIZE_LIMITS,
  buildLimitCompressionOption,
  compressCanvasToJpeg,
  getCompressionPresetByKey,
} from './modules/compress.js';
import {
  createDownloadFileName,
  createOriginalCompressedFileName,
  downloadBlob,
} from './modules/download.js';
import { COMMON_EXAM_TEMPLATES } from './modules/templates.js';

const app = document.querySelector('#app');

function createTemplateCards() {
  return COMMON_EXAM_TEMPLATES.map((template) => `
    <button class="template-card" type="button" data-template-key="${template.key}">
      <strong>${template.label}</strong>
      <span>${template.description}</span>
    </button>
  `).join('');
}

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
      <span>${size.key === 'custom' ? '输入任意 mm / px' : `${size.widthMm}×${size.heightMm} mm`}</span>
      <span>${size.key === 'custom' ? '适合特殊报名系统' : `${size.widthPx}×${size.heightPx} px`}</span>
    </button>
  `).join('');
}

function createCompressionCards() {
  return COMPRESSION_PRESETS.map((preset) => `
    <button class="compression-card" type="button" data-compression-key="${preset.key}">
      <strong>${preset.label}</strong>
      <span>${preset.hint}</span>
      <span>目标约 ${(preset.maxBytes / 1024).toFixed(0)} KB</span>
    </button>
  `).join('');
}

function createLimitChips() {
  return FILE_SIZE_LIMITS.map((limitKb) => `
    <button class="limit-chip" type="button" data-limit-kb="${limitKb}">
      &lt; ${limitKb} KB
    </button>
  `).join('');
}

function formatTemplateSizeDescription(template) {
  if (template.sizeType === 'custom') {
    return `${template.width}×${template.height}${template.sizeUnit}`;
  }

  const size = getPhotoSizeByKey(template.sizeKey);
  return `${size.widthMm}×${size.heightMm}mm`;
}

function formatTemplateCompressionDescription(template) {
  if (template.compressionMode === 'limit') {
    return `小于 ${template.limitKb}KB`;
  }

  const preset = getCompressionPresetByKey(template.compressionKey);
  return `${preset.label}（约 ${Math.round(preset.maxBytes / 1024)}KB）`;
}

app.innerHTML = `
  <main class="app-shell">
    <header class="hero">
      <p class="eyebrow">Browser-only ID Photo Tool</p>
      <h1>全能证件照处理</h1>
      <p class="subtitle">完全本地处理，照片不会离开你的设备</p>
      <p class="hero-description">
        这是一个面向报名、考试、签证和日常使用场景的全能证件照处理工具，支持照片抠图、换底色、尺寸调整、文件压缩、模板套用和自定义导出，帮助你更省心地处理各类证件照问题。
      </p>
    </header>

    <section id="studioCard" class="studio-card" aria-label="证件照处理区">
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
          <div class="preview-actions">
            <button id="removeButton" class="primary-button" type="button">开始抠图</button>
            <button id="downloadOriginalButton" class="secondary-button" type="button">
              直接压缩原图
            </button>
          </div>
          <div class="export-meta">
            <span id="originalExportSizeText">原图压缩后：--</span>
            <span id="originalCompressionHintText">压缩模式：--</span>
          </div>
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

      <section id="composePanel" class="compose-panel" aria-label="排版设置">
        <div class="compose-settings">
          <div class="section-heading">
            <p class="eyebrow compact">Workflow</p>
            <h2>模板、尺寸与压缩设置</h2>
            <p>模板为常见参数，请以目标报名系统的最新说明为准。上传后即可直接压缩原图，抠图后可按规格生成证件照。</p>
          </div>

          <div class="setting-group">
            <h3>常见考试模板</h3>
            <div id="templateOptions" class="template-options">
              ${createTemplateCards()}
            </div>
            <p class="helper-note">模板会一键带入底色、尺寸和文件大小限制，之后你仍可手动微调。</p>
          </div>

          <div class="setting-group">
            <h3>模板说明栏</h3>
            <div class="template-summary">
              <div class="template-summary__badge">
                <span>当前来源</span>
                <strong id="templateSourceText">未选择模板</strong>
              </div>
              <div class="template-summary__grid">
                <div class="template-summary__card">
                  <p>模板默认</p>
                  <ul id="templateDefaultList" class="template-summary__list">
                    <li>尺寸：--</li>
                    <li>底色：--</li>
                    <li>文件上限：--</li>
                  </ul>
                </div>
                <div class="template-summary__card">
                  <p>当前实际值</p>
                  <ul id="templateCurrentList" class="template-summary__list">
                    <li>尺寸：--</li>
                    <li>底色：--</li>
                    <li>文件上限：--</li>
                  </ul>
                </div>
              </div>
              <p id="templateSummaryNote" class="helper-note">你可以直接套用模板，也可以继续自定义尺寸、底色和文件大小限制。</p>
            </div>
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

            <div id="customSizePanel" class="custom-size-panel is-hidden">
              <div class="unit-tabs">
                <button id="unitMmButton" class="unit-tab" type="button" data-size-unit="mm">按 mm 输入</button>
                <button id="unitPxButton" class="unit-tab" type="button" data-size-unit="px">按 px 输入</button>
              </div>
              <div class="custom-size-grid">
                <label class="form-field">
                  <span id="widthLabel">宽度（mm）</span>
                  <input id="customWidthInput" type="number" min="1" step="0.1" inputmode="decimal" />
                </label>
                <label class="form-field">
                  <span id="heightLabel">高度（mm）</span>
                  <input id="customHeightInput" type="number" min="1" step="0.1" inputmode="decimal" />
                </label>
              </div>
              <p id="customSizeSummary" class="helper-note">换算结果：--</p>
            </div>
          </div>

          <div class="setting-group">
            <h3>文件大小优化</h3>
            <div class="compression-mode-tabs">
              <button id="presetModeButton" class="compression-mode-tab" type="button" data-compression-mode="preset">档位压缩</button>
              <button id="limitModeButton" class="compression-mode-tab" type="button" data-compression-mode="limit">指定上限</button>
            </div>

            <div id="presetCompressionPanel" class="compression-panel">
              <div id="compressionOptions" class="compression-options">
                ${createCompressionCards()}
              </div>
            </div>

            <div id="limitCompressionPanel" class="compression-panel is-hidden">
              <div id="limitQuickOptions" class="limit-quick-options">
                ${createLimitChips()}
              </div>
              <label class="form-field limit-input-row">
                <span>目标小于（KB）</span>
                <input id="limitKbInput" type="number" min="10" max="500" step="1" inputmode="numeric" />
              </label>
              <p class="helper-note">常用报名限制可填 20 / 30 / 50 / 100 / 200 KB。</p>
            </div>
          </div>
        </div>

        <aside class="final-preview-card">
          <div class="preview-card__header">
            <h2>证件照预览</h2>
            <span id="finalMeta" class="file-meta"></span>
          </div>
          <div class="final-preview-frame">
            <canvas id="finalCanvas" aria-label="证件照成品预览"></canvas>
            <div id="finalEmptyState" class="final-empty-state">完成抠图后，这里会显示证件照预览。</div>
          </div>
          <div class="export-meta">
            <span id="exportSizeText">预计文件大小：--</span>
            <span id="compressionHintText">压缩模式：--</span>
          </div>
          <button id="downloadButton" class="primary-button download-button" type="button">
            下载当前证件照
          </button>
        </aside>
      </section>
    </section>
  </main>
`;

const elements = {
  studioCard: document.querySelector('#studioCard'),
  uploadDropzone: document.querySelector('#uploadDropzone'),
  photoInput: document.querySelector('#photoInput'),
  message: document.querySelector('#message'),
  previewGrid: document.querySelector('#previewGrid'),
  fileMeta: document.querySelector('#fileMeta'),
  originalCanvas: document.querySelector('#originalCanvas'),
  removeButton: document.querySelector('#removeButton'),
  downloadOriginalButton: document.querySelector('#downloadOriginalButton'),
  originalExportSizeText: document.querySelector('#originalExportSizeText'),
  originalCompressionHintText: document.querySelector('#originalCompressionHintText'),
  resultCard: document.querySelector('#resultCard'),
  resultCanvas: document.querySelector('#resultCanvas'),
  loading: document.querySelector('#loading'),
  composePanel: document.querySelector('#composePanel'),
  templateOptions: document.querySelector('#templateOptions'),
  templateSourceText: document.querySelector('#templateSourceText'),
  templateDefaultList: document.querySelector('#templateDefaultList'),
  templateCurrentList: document.querySelector('#templateCurrentList'),
  templateSummaryNote: document.querySelector('#templateSummaryNote'),
  colorOptions: document.querySelector('#colorOptions'),
  sizeOptions: document.querySelector('#sizeOptions'),
  customSizePanel: document.querySelector('#customSizePanel'),
  unitMmButton: document.querySelector('#unitMmButton'),
  unitPxButton: document.querySelector('#unitPxButton'),
  widthLabel: document.querySelector('#widthLabel'),
  heightLabel: document.querySelector('#heightLabel'),
  customWidthInput: document.querySelector('#customWidthInput'),
  customHeightInput: document.querySelector('#customHeightInput'),
  customSizeSummary: document.querySelector('#customSizeSummary'),
  presetModeButton: document.querySelector('#presetModeButton'),
  limitModeButton: document.querySelector('#limitModeButton'),
  presetCompressionPanel: document.querySelector('#presetCompressionPanel'),
  limitCompressionPanel: document.querySelector('#limitCompressionPanel'),
  compressionOptions: document.querySelector('#compressionOptions'),
  limitQuickOptions: document.querySelector('#limitQuickOptions'),
  limitKbInput: document.querySelector('#limitKbInput'),
  finalCanvas: document.querySelector('#finalCanvas'),
  finalEmptyState: document.querySelector('#finalEmptyState'),
  finalMeta: document.querySelector('#finalMeta'),
  exportSizeText: document.querySelector('#exportSizeText'),
  compressionHintText: document.querySelector('#compressionHintText'),
  downloadButton: document.querySelector('#downloadButton'),
};

let composePreviewTimer = null;
let composeRenderVersion = 0;
let originalCompressTimer = null;
let originalCompressVersion = 0;

function formatFileSize(bytes) {
  if (!bytes) {
    return '--';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(bytes > 200 * 1024 ? 0 : 1)} KB`;
}

function createCanvasFromBitmap(bitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);

  return canvas;
}

function showMessage(text, type = 'info') {
  elements.message.textContent = text;
  elements.message.dataset.type = type;
  elements.message.classList.toggle('is-hidden', !text);
}

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
  if (appState.selectedSizeKey === 'custom') {
    return buildCustomPhotoSize({
      unit: appState.customSizeUnit,
      width: appState.customWidth,
      height: appState.customHeight,
    });
  }

  return getPhotoSizeByKey(appState.selectedSizeKey);
}

function getSelectedColor() {
  return getPhotoColorByKey(appState.selectedColorKey);
}

function getActiveCompressionOption() {
  if (appState.compressionMode === 'limit') {
    return buildLimitCompressionOption(appState.selectedLimitKb);
  }

  return getCompressionPresetByKey(appState.selectedCompressionKey);
}

function getCurrentSizeDescription(size) {
  if (!size) {
    return '--';
  }

  return `${size.widthMm}×${size.heightMm}mm · ${size.widthPx}×${size.heightPx}px`;
}

function getCurrentCompressionDescription(option) {
  if (!option) {
    return '--';
  }

  if (appState.compressionMode === 'limit') {
    return `小于 ${Math.round(option.maxBytes / 1024)}KB`;
  }

  return `${option.label}（约 ${Math.round(option.maxBytes / 1024)}KB）`;
}

function updateTemplateSummary() {
  const activeTemplate = COMMON_EXAM_TEMPLATES.find((item) => item.key === appState.selectedTemplateKey);
  const selectedSize = getSelectedSize();
  const selectedColor = getSelectedColor();
  const compressionOption = getActiveCompressionOption();

  if (activeTemplate) {
    elements.templateSourceText.textContent = activeTemplate.label;
    elements.templateDefaultList.innerHTML = `
      <li>尺寸：${formatTemplateSizeDescription(activeTemplate)}</li>
      <li>底色：${getPhotoColorByKey(activeTemplate.colorKey).label}</li>
      <li>文件上限：${formatTemplateCompressionDescription(activeTemplate)}</li>
    `;
    elements.templateSummaryNote.textContent = '当前正在使用模板默认参数；你仍然可以继续手动调整，修改后会自动切换为自定义。';
  } else {
    elements.templateSourceText.textContent = '手动自定义';
    elements.templateDefaultList.innerHTML = `
      <li>尺寸：可选内置规格或任意 mm / px</li>
      <li>底色：支持白、蓝、红、渐变蓝、浅灰</li>
      <li>文件上限：支持档位压缩或自定义 KB 上限</li>
    `;
    elements.templateSummaryNote.textContent = '你现在使用的是自定义参数组合，可以自由修改尺寸、底色和文件大小限制。';
  }

  elements.templateCurrentList.innerHTML = `
    <li>尺寸：${getCurrentSizeDescription(selectedSize)}</li>
    <li>底色：${selectedColor.label}</li>
    <li>文件上限：${getCurrentCompressionDescription(compressionOption)}</li>
  `;
}

function updateCustomSizeSummary() {
  const customSize = buildCustomPhotoSize({
    unit: appState.customSizeUnit,
    width: appState.customWidth,
    height: appState.customHeight,
  });

  const isMillimeterMode = appState.customSizeUnit === 'mm';
  elements.widthLabel.textContent = `宽度（${isMillimeterMode ? 'mm' : 'px'}）`;
  elements.heightLabel.textContent = `高度（${isMillimeterMode ? 'mm' : 'px'}）`;
  elements.customWidthInput.step = isMillimeterMode ? '0.1' : '1';
  elements.customHeightInput.step = isMillimeterMode ? '0.1' : '1';
  elements.customWidthInput.value = appState.customWidth;
  elements.customHeightInput.value = appState.customHeight;

  if (!customSize) {
    elements.customSizeSummary.textContent = '换算结果：请输入有效的宽高。';
    return;
  }

  elements.customSizeSummary.textContent = `换算结果：${customSize.widthMm}×${customSize.heightMm} mm · ${customSize.widthPx}×${customSize.heightPx} px`;
}

function updateCompressionPanels() {
  const isLimitMode = appState.compressionMode === 'limit';
  elements.presetCompressionPanel.classList.toggle('is-hidden', isLimitMode);
  elements.limitCompressionPanel.classList.toggle('is-hidden', !isLimitMode);
  elements.limitKbInput.value = appState.selectedLimitKb;
}

function syncSelectedControls() {
  elements.templateOptions.querySelectorAll('.template-card').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.templateKey === appState.selectedTemplateKey);
  });

  elements.colorOptions.querySelectorAll('.color-swatch').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.colorKey === appState.selectedColorKey);
  });

  elements.sizeOptions.querySelectorAll('.size-card').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.sizeKey === appState.selectedSizeKey);
  });

  elements.customSizePanel.classList.toggle('is-hidden', appState.selectedSizeKey !== 'custom');
  elements.unitMmButton.classList.toggle('is-selected', appState.customSizeUnit === 'mm');
  elements.unitPxButton.classList.toggle('is-selected', appState.customSizeUnit === 'px');
  updateCustomSizeSummary();

  elements.presetModeButton.classList.toggle('is-selected', appState.compressionMode === 'preset');
  elements.limitModeButton.classList.toggle('is-selected', appState.compressionMode === 'limit');
  updateCompressionPanels();

  elements.compressionOptions.querySelectorAll('.compression-card').forEach((button) => {
    button.classList.toggle(
      'is-selected',
      button.dataset.compressionKey === appState.selectedCompressionKey,
    );
  });

  elements.limitQuickOptions.querySelectorAll('.limit-chip').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.limitKb === String(appState.selectedLimitKb));
  });

  updateTemplateSummary();
}

function setFinalPreviewEmptyState(isEmpty) {
  elements.finalCanvas.classList.toggle('is-hidden', isEmpty);
  elements.finalEmptyState.classList.toggle('is-hidden', !isEmpty);
}

function getCompressionSummaryText(option) {
  if (!option) {
    return '压缩模式：请输入有效的大小上限';
  }

  if (appState.compressionMode === 'limit') {
    return `压缩模式：小于 ${Math.round(option.maxBytes / 1024)} KB`;
  }

  return `压缩模式：${option.label} · 目标约 ${Math.round(option.maxBytes / 1024)} KB`;
}

async function renderOriginalCompressionEstimate() {
  if (!appState.originalImageBitmap) {
    return;
  }

  const compressionOption = getActiveCompressionOption();

  if (!compressionOption) {
    elements.originalExportSizeText.textContent = '原图压缩后：--';
    elements.originalCompressionHintText.textContent = '压缩模式：请输入有效的大小上限';
    elements.downloadOriginalButton.disabled = true;
    return;
  }

  const renderVersion = (originalCompressVersion += 1);

  try {
    elements.originalExportSizeText.textContent = '原图压缩后：计算中...';
    elements.originalCompressionHintText.textContent = getCompressionSummaryText(compressionOption);
    elements.downloadOriginalButton.disabled = true;

    const blob = await compressCanvasToJpeg(
      createCanvasFromBitmap(appState.originalImageBitmap),
      compressionOption,
    );

    if (renderVersion === originalCompressVersion) {
      setOriginalCompressedBlob(blob);
      elements.originalExportSizeText.textContent = `原图压缩后：${formatFileSize(blob.size)}`;
      elements.originalCompressionHintText.textContent = getCompressionSummaryText(compressionOption);
      elements.downloadOriginalButton.disabled = false;
    }
  } catch (error) {
    console.error('原图压缩预估失败：', error);
    showMessage('原图压缩失败，请重新选择图片或压缩参数再试。', 'error');
    elements.downloadOriginalButton.disabled = false;
  }
}

async function renderComposedPreview() {
  if (!appState.removedBackgroundImageBitmap) {
    setFinalPreviewEmptyState(true);
    elements.finalMeta.textContent = '';
    elements.exportSizeText.textContent = '预计文件大小：--';
    elements.downloadButton.disabled = true;
    return;
  }

  const selectedSize = getSelectedSize();
  const selectedColor = getSelectedColor();
  const compressionOption = getActiveCompressionOption();

  if (!selectedSize) {
    setFinalPreviewEmptyState(true);
    elements.finalMeta.textContent = '';
    elements.exportSizeText.textContent = '预计文件大小：--';
    elements.compressionHintText.textContent = '请先输入有效的自定义尺寸';
    elements.downloadButton.disabled = true;
    return;
  }

  if (!compressionOption) {
    setFinalPreviewEmptyState(true);
    elements.finalMeta.textContent = `${selectedSize.widthPx}×${selectedSize.heightPx} px`;
    elements.exportSizeText.textContent = '预计文件大小：--';
    elements.compressionHintText.textContent = '请先输入有效的大小上限';
    elements.downloadButton.disabled = true;
    return;
  }

  const renderVersion = (composeRenderVersion += 1);

  try {
    setFinalPreviewEmptyState(false);
    renderComposedPhotoToCanvas(
      elements.finalCanvas,
      appState.removedBackgroundImageBitmap,
      selectedSize,
      selectedColor,
      0.5,
    );

    elements.finalMeta.textContent = `${selectedSize.widthPx}×${selectedSize.heightPx} px`;
    elements.exportSizeText.textContent = '预计文件大小：计算中...';
    elements.compressionHintText.textContent = getCompressionSummaryText(compressionOption);
    elements.downloadButton.disabled = true;

    const exportCanvas = createComposedPhotoCanvas(
      appState.removedBackgroundImageBitmap,
      selectedSize,
      selectedColor,
    );
    const blob = await compressCanvasToJpeg(exportCanvas, compressionOption);

    if (renderVersion === composeRenderVersion) {
      setComposedPhotoBlob(blob);
      elements.exportSizeText.textContent = `预计文件大小：${formatFileSize(blob.size)}`;
      elements.compressionHintText.textContent = getCompressionSummaryText(compressionOption);
      elements.downloadButton.disabled = false;
    }
  } catch (error) {
    console.error('成品预览生成失败：', error);
    showMessage('成品预览生成失败，请重新选择底色、尺寸或压缩参数再试。', 'error');
    elements.downloadButton.disabled = false;
  }
}

function scheduleOriginalCompressionRender() {
  window.clearTimeout(originalCompressTimer);
  originalCompressTimer = window.setTimeout(() => {
    renderOriginalCompressionEstimate();
  }, 300);
}

function scheduleComposedPreviewRender() {
  window.clearTimeout(composePreviewTimer);
  composePreviewTimer = window.setTimeout(() => {
    renderComposedPreview();
  }, 300);
}

function handleManualSettingChange() {
  clearSelectedTemplate();
  syncSelectedControls();
}

function applyTemplate(templateKey) {
  const template = COMMON_EXAM_TEMPLATES.find((item) => item.key === templateKey);

  if (!template) {
    return;
  }

  setSelectedTemplate(template.key);
  setSelectedColor(template.colorKey);

  if (template.sizeType === 'custom') {
    setSelectedSize('custom');
    setCustomSizeUnit(template.sizeUnit);
    setCustomSizeValue('customWidth', String(template.width));
    setCustomSizeValue('customHeight', String(template.height));
  } else {
    setSelectedSize(template.sizeKey);
  }

  setCompressionMode(template.compressionMode);

  if (template.compressionMode === 'limit') {
    setSelectedLimitKb(String(template.limitKb));
  } else if (template.compressionKey) {
    setSelectedCompression(template.compressionKey);
  }

  syncSelectedControls();
  scheduleOriginalCompressionRender();
  scheduleComposedPreviewRender();
}

async function handlePhotoSelected(file) {
  try {
    resetResult();
    showMessage('');
    elements.resultCard.classList.add('is-hidden');
    elements.composePanel.classList.remove('is-hidden');
    elements.downloadButton.disabled = true;
    elements.downloadOriginalButton.disabled = true;
    elements.exportSizeText.textContent = '预计文件大小：--';
    elements.compressionHintText.textContent = '压缩模式：--';
    elements.originalExportSizeText.textContent = '原图压缩后：--';
    elements.originalCompressionHintText.textContent = '压缩模式：--';
    setFinalPreviewEmptyState(true);

    const imageBitmap = await createImageBitmap(file);
    setOriginalImage(file, imageBitmap);

    drawBitmapToCanvas(elements.originalCanvas, imageBitmap);
    elements.fileMeta.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;
    elements.previewGrid.classList.remove('is-hidden');
    syncSelectedControls();
    await renderOriginalCompressionEstimate();
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

    const resultBitmap = await removePhotoBackground(appState.originalFile);
    setRemovedBackgroundImage(resultBitmap);

    drawBitmapToCanvas(elements.resultCanvas, resultBitmap);
    elements.resultCard.classList.remove('is-hidden');
    await renderComposedPreview();
    showMessage('抠图完成，已生成当前模板下的证件照预览。', 'success');
  } catch (error) {
    console.error('抠图失败：', error);
    showMessage('抠图失败。请检查网络是否能下载首次模型，或换一张主体更清晰的照片再试。', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleOriginalDownload() {
  if (!appState.originalImageBitmap || !appState.originalFile) {
    showMessage('请先上传一张图片，再压缩原图。', 'error');
    return;
  }

  const compressionOption = getActiveCompressionOption();

  if (!compressionOption) {
    showMessage('请先输入有效的文件大小上限。', 'error');
    return;
  }

  try {
    elements.downloadOriginalButton.disabled = true;

    const blob =
      appState.originalCompressedBlob ||
      (await compressCanvasToJpeg(createCanvasFromBitmap(appState.originalImageBitmap), compressionOption));

    setOriginalCompressedBlob(blob);
    elements.originalExportSizeText.textContent = `原图压缩后：${formatFileSize(blob.size)}`;
    downloadBlob(
      blob,
      createOriginalCompressedFileName(appState.originalFile.name, compressionOption.label),
    );
    showMessage('下载已开始，原图会按当前压缩参数导出为 JPG。', 'success');
  } catch (error) {
    console.error('原图下载失败：', error);
    showMessage('原图压缩下载失败，请稍后重试。', 'error');
  } finally {
    elements.downloadOriginalButton.disabled = false;
  }
}

async function handleComposedDownload() {
  if (!appState.removedBackgroundImageBitmap) {
    showMessage('请先完成抠图，再下载证件照。', 'error');
    return;
  }

  const selectedSize = getSelectedSize();
  const selectedColor = getSelectedColor();
  const compressionOption = getActiveCompressionOption();

  if (!selectedSize) {
    showMessage('请先输入有效的自定义尺寸。', 'error');
    return;
  }

  if (!compressionOption) {
    showMessage('请先输入有效的文件大小上限。', 'error');
    return;
  }

  try {
    elements.downloadButton.disabled = true;

    const blob =
      appState.composedPhotoBlob ||
      (await compressCanvasToJpeg(
        createComposedPhotoCanvas(
          appState.removedBackgroundImageBitmap,
          selectedSize,
          selectedColor,
        ),
        compressionOption,
      ));

    setComposedPhotoBlob(blob);
    elements.exportSizeText.textContent = `预计文件大小：${formatFileSize(blob.size)}`;
    downloadBlob(blob, createDownloadFileName(selectedSize, selectedColor, compressionOption.label));
    showMessage('下载已开始，当前证件照会按所选参数导出为 JPG。', 'success');
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
elements.downloadOriginalButton.addEventListener('click', handleOriginalDownload);
elements.downloadButton.addEventListener('click', handleComposedDownload);

elements.templateOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-template-key]');

  if (!button) {
    return;
  }

  applyTemplate(button.dataset.templateKey);
});

elements.colorOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-color-key]');

  if (!button) {
    return;
  }

  setSelectedColor(button.dataset.colorKey);
  handleManualSettingChange();
  scheduleComposedPreviewRender();
});

elements.sizeOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-size-key]');

  if (!button) {
    return;
  }

  setSelectedSize(button.dataset.sizeKey);
  handleManualSettingChange();
  scheduleComposedPreviewRender();
});

[elements.unitMmButton, elements.unitPxButton].forEach((button) => {
  button.addEventListener('click', () => {
    if (appState.customSizeUnit !== button.dataset.sizeUnit) {
      const currentSize = buildCustomPhotoSize({
        unit: appState.customSizeUnit,
        width: appState.customWidth,
        height: appState.customHeight,
      });

      if (currentSize) {
        if (button.dataset.sizeUnit === 'px') {
          setCustomSizeValue('customWidth', String(currentSize.widthPx));
          setCustomSizeValue('customHeight', String(currentSize.heightPx));
        } else {
          setCustomSizeValue('customWidth', String(currentSize.widthMm));
          setCustomSizeValue('customHeight', String(currentSize.heightMm));
        }
      }
    }

    setCustomSizeUnit(button.dataset.sizeUnit);
    handleManualSettingChange();
    scheduleComposedPreviewRender();
  });
});

elements.customWidthInput.addEventListener('input', (event) => {
  setCustomSizeValue('customWidth', event.target.value);
  handleManualSettingChange();
  scheduleComposedPreviewRender();
});

elements.customHeightInput.addEventListener('input', (event) => {
  setCustomSizeValue('customHeight', event.target.value);
  handleManualSettingChange();
  scheduleComposedPreviewRender();
});

[elements.presetModeButton, elements.limitModeButton].forEach((button) => {
  button.addEventListener('click', () => {
    setCompressionMode(button.dataset.compressionMode);
    handleManualSettingChange();
    scheduleOriginalCompressionRender();
    scheduleComposedPreviewRender();
  });
});

elements.compressionOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-compression-key]');

  if (!button) {
    return;
  }

  setSelectedCompression(button.dataset.compressionKey);
  handleManualSettingChange();
  scheduleOriginalCompressionRender();
  scheduleComposedPreviewRender();
});

elements.limitQuickOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-limit-kb]');

  if (!button) {
    return;
  }

  setSelectedLimitKb(button.dataset.limitKb);
  handleManualSettingChange();
  scheduleOriginalCompressionRender();
  scheduleComposedPreviewRender();
});

elements.limitKbInput.addEventListener('input', (event) => {
  setSelectedLimitKb(event.target.value);
  handleManualSettingChange();
  scheduleOriginalCompressionRender();
  scheduleComposedPreviewRender();
});

syncSelectedControls();
setFinalPreviewEmptyState(true);
