import { PHOTO_BACKGROUND_COLORS } from './compose.js';
import { PHOTO_SIZES } from './sizes.js';

export const appState = {
  originalFile: null,
  originalImageBitmap: null,
  removedBackgroundImageBitmap: null,
  selectedSizeKey: PHOTO_SIZES[0].key,
  selectedColorKey: PHOTO_BACKGROUND_COLORS[0].key,
  composedPhotoBlob: null,
};

export function setOriginalImage(file, imageBitmap) {
  // 上传新图片时，释放旧图片占用的内存。
  appState.originalImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap?.close?.();

  appState.originalFile = file;
  appState.originalImageBitmap = imageBitmap;
  appState.removedBackgroundImageBitmap = null;
  appState.composedPhotoBlob = null;
}

export function setRemovedBackgroundImage(imageBitmap) {
  // 重复抠图时，只替换结果图，保留当前原图。
  appState.removedBackgroundImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap = imageBitmap;
  appState.composedPhotoBlob = null;
}

export function setSelectedSize(sizeKey) {
  appState.selectedSizeKey = sizeKey;
  appState.composedPhotoBlob = null;
}

export function setSelectedColor(colorKey) {
  appState.selectedColorKey = colorKey;
  appState.composedPhotoBlob = null;
}

export function setComposedPhotoBlob(blob) {
  appState.composedPhotoBlob = blob;
}

export function resetResult() {
  // 选择新图片前清空上一张图片的抠图结果。
  appState.removedBackgroundImageBitmap?.close?.();
  appState.removedBackgroundImageBitmap = null;
  appState.composedPhotoBlob = null;
}
