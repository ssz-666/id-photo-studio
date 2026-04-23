export function createDownloadFileName(size, color) {
  const timestamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d+Z$/, '');

  return `证件照_${size.label}_${color.label}_${timestamp}.jpg`;
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
