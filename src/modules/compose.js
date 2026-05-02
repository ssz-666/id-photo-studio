export const PHOTO_BACKGROUND_COLORS = [
  {
    key: 'white',
    label: '白色',
    type: 'solid',
    value: '#FFFFFF',
  },
  {
    key: 'blue',
    label: '标准蓝',
    type: 'solid',
    value: '#438EDB',
  },
  {
    key: 'red',
    label: '标准红',
    type: 'solid',
    value: '#D92B2B',
  },
  {
    key: 'gradient-blue',
    label: '渐变蓝',
    type: 'gradient',
    from: '#438EDB',
    to: '#2A5DAC',
  },
  {
    key: 'light-gray',
    label: '浅灰',
    type: 'solid',
    value: '#E8E8E8',
  },
];

export function getPhotoColorByKey(key) {
  return PHOTO_BACKGROUND_COLORS.find((color) => color.key === key) || PHOTO_BACKGROUND_COLORS[0];
}

function fillBackground(context, width, height, color) {
  if (color.type === 'gradient') {
    // 渐变蓝按证件照常见方式从上到下过渡。
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color.from);
    gradient.addColorStop(1, color.to);
    context.fillStyle = gradient;
  } else {
    context.fillStyle = color.value;
  }

  context.fillRect(0, 0, width, height);
}

function createSourceCanvas(imageBitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(imageBitmap, 0, 0);

  return { canvas, context };
}

function getOpaqueBounds(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasOpaquePixel = false;

  // 根据 alpha 通道找出人像有效区域，避免透明边缘影响居中排版。
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 10) {
        hasOpaquePixel = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasOpaquePixel) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function drawCenteredPortrait(context, imageBitmap, canvasWidth, canvasHeight) {
  const { canvas: sourceCanvas, context: sourceContext } = createSourceCanvas(imageBitmap);
  const bounds = getOpaqueBounds(sourceContext, sourceCanvas.width, sourceCanvas.height);

  // 证件照主体应该从头顶少量留白开始，肩膀自然压到画面下方，而不是悬在中间。
  const topPadding = canvasHeight * 0.08;
  const bottomOverflow = canvasHeight * 0.01;
  const bottomPadding = -bottomOverflow;
  const targetHeightByRule = canvasHeight - topPadding - bottomPadding;
  const scaleByHeight = targetHeightByRule / bounds.height;
  const minPortraitWidth = canvasWidth * 1.08;
  const scaleByWidth = minPortraitWidth / bounds.width;
  const scale = Math.max(scaleByHeight, scaleByWidth);
  const targetWidth = bounds.width * scale;
  const targetHeight = bounds.height * scale;
  const targetX = (canvasWidth - targetWidth) / 2;
  const targetY = topPadding;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    sourceCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
}

export function renderComposedPhotoToCanvas(canvas, imageBitmap, size, color, scale = 1) {
  const canvasWidth = Math.round(size.widthPx * scale);
  const canvasHeight = Math.round(size.heightPx * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.aspectRatio = `${size.widthPx} / ${size.heightPx}`;

  fillBackground(context, canvasWidth, canvasHeight, color);
  drawCenteredPortrait(context, imageBitmap, canvasWidth, canvasHeight);
}

export function createComposedPhotoCanvas(imageBitmap, size, color) {
  const canvas = document.createElement('canvas');

  // 导出或压缩都基于完整像素尺寸的离屏 Canvas 进行。
  renderComposedPhotoToCanvas(canvas, imageBitmap, size, color, 1);

  return canvas;
}

export async function createComposedPhotoBlob(imageBitmap, size, color, quality = 0.95) {
  const canvas = createComposedPhotoCanvas(imageBitmap, size, color);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('照片导出失败'));
      },
      'image/jpeg',
      quality,
    );
  });
}
