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
];

export function getPhotoSizeByKey(key) {
  return PHOTO_SIZES.find((size) => size.key === key) || PHOTO_SIZES[0];
}
