export function createDownloadFileName(size, color, suffix = '') {
  const timestamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d+Z$/, '');

  const suffixText = suffix ? `_${suffix}` : '';

  return `证件照_${size.label}_${color.label}${suffixText}_${timestamp}.jpg`;
}

export function createOriginalCompressedFileName(originalFileName = '原图', suffix = '') {
  const timestamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d+Z$/, '');
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const suffixText = suffix ? `_${suffix}` : '';

  return `${baseName}${suffixText}_${timestamp}.jpg`;
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // 延迟释放 URL，确保浏览器有足够时间开始下载。
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
