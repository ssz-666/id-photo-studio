const DPI = 300;
const MM_PER_INCH = 25.4;

export const PHOTO_SIZES = [
  {
    key: 'one-inch',
    label: '一寸',
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
  },
  {
    key: 'two-inch',
    label: '二寸',
    widthMm: 35,
    heightMm: 49,
    widthPx: 413,
    heightPx: 579,
  },
  {
    key: 'small-one-inch',
    label: '小一寸',
    widthMm: 22,
    heightMm: 32,
    widthPx: 260,
    heightPx: 378,
  },
  {
    key: 'large-one-inch',
    label: '大一寸',
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
  },
  {
    key: 'visa',
    label: '签证照',
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
  },
  {
    key: 'social-security',
    label: '社保照',
    widthMm: 26,
    heightMm: 32,
    widthPx: 307,
    heightPx: 378,
  },
  {
    key: 'custom',
    label: '自定义',
    widthMm: 0,
    heightMm: 0,
    widthPx: 0,
    heightPx: 0,
  },
];

export function mmToPx(mm) {
  return Math.round((Number(mm) / MM_PER_INCH) * DPI);
}

export function pxToMm(px) {
  return Number((((Number(px) / DPI) * MM_PER_INCH) || 0).toFixed(1));
}

export function getPhotoSizeByKey(key) {
  return PHOTO_SIZES.find((size) => size.key === key) || PHOTO_SIZES[0];
}

export function buildCustomPhotoSize({ unit, width, height }) {
  const numericWidth = Number(width);
  const numericHeight = Number(height);

  if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight) || numericWidth <= 0 || numericHeight <= 0) {
    return null;
  }

  if (unit === 'px') {
    return {
      key: 'custom',
      label: '自定义',
      widthMm: pxToMm(numericWidth),
      heightMm: pxToMm(numericHeight),
      widthPx: Math.round(numericWidth),
      heightPx: Math.round(numericHeight),
    };
  }

  return {
    key: 'custom',
    label: '自定义',
    widthMm: Number(numericWidth.toFixed(1)),
    heightMm: Number(numericHeight.toFixed(1)),
    widthPx: mmToPx(numericWidth),
    heightPx: mmToPx(numericHeight),
  };
}
