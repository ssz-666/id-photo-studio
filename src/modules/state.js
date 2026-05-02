import { PHOTO_BACKGROUND_COLORS } from './compose.js';
import { COMPRESSION_PRESETS, FILE_SIZE_LIMITS } from './compress.js';
import { PHOTO_SIZES } from './sizes.js';

export const appState = {
  originalFile: null,
  originalImageBitmap: null,
  removedBackgroundImageBitmap: null,
  selectedTemplateKey: '',
  selectedSizeKey: PHOTO_SIZES[0].key,
  customSizeUnit: 'mm',
  customWidth: '35',
  customHeight: '45',
  selectedColorKey: PHOTO_BACKGROUND_COLORS[0].key,
  compressionMode: 'preset',
  selectedCompressionKey: COMPRESSION_PRESETS[1].key,
  selectedLimitKb: String(FILE_SIZE_LIMITS[1]),
  originalCompressedBlob: null,
  composedPhotoBlob: null,
};

function clearExportCache() {
  appState.originalCompressedBlob = null;
  appState.composedPhotoBlob = null;
}

export function setOriginalImage(file, imageBitmap) {
  appState.originalImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap?.close?.();

  appState.originalFile = file;
  appState.originalImageBitmap = imageBitmap;
  appState.removedBackgroundImageBitmap = null;
  clearExportCache();
}

export function setRemovedBackgroundImage(imageBitmap) {
  appState.removedBackgroundImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap = imageBitmap;
  appState.composedPhotoBlob = null;
}

export function setSelectedTemplate(templateKey) {
  appState.selectedTemplateKey = templateKey;
}

export function clearSelectedTemplate() {
  appState.selectedTemplateKey = '';
}

export function setSelectedSize(sizeKey) {
  appState.selectedSizeKey = sizeKey;
  appState.composedPhotoBlob = null;
}

export function setCustomSizeUnit(unit) {
  appState.customSizeUnit = unit;
  appState.composedPhotoBlob = null;
}

export function setCustomSizeValue(field, value) {
  appState[field] = value;
  appState.composedPhotoBlob = null;
}

export function setSelectedColor(colorKey) {
  appState.selectedColorKey = colorKey;
  appState.composedPhotoBlob = null;
}

export function setCompressionMode(mode) {
  appState.compressionMode = mode;
  clearExportCache();
}

export function setSelectedCompression(compressionKey) {
  appState.selectedCompressionKey = compressionKey;
  clearExportCache();
}

export function setSelectedLimitKb(limitKb) {
  appState.selectedLimitKb = limitKb;
  clearExportCache();
}

export function setOriginalCompressedBlob(blob) {
  appState.originalCompressedBlob = blob;
}

export function setComposedPhotoBlob(blob) {
  appState.composedPhotoBlob = blob;
}

export function resetResult() {
  appState.removedBackgroundImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap = null;
  clearExportCache();
}
