const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

function getImageFileFromList(fileList) {
  return Array.from(fileList).find((file) => file.type.startsWith('image/')) || null;
}

function validateImageFile(file) {
  if (!file) {
    return '没有读取到图片文件，请重新选择。';
  }

  if (!acceptedImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
    return '请选择有效的图片文件。';
  }

  return '';
}

export function setupUploader({ inputElement, dropzoneElement, onFileSelected, onError }) {
  async function handleFile(file) {
    const errorMessage = validateImageFile(file);

    if (errorMessage) {
      onError(errorMessage);
      return;
    }

    await onFileSelected(file);
  }

  inputElement.addEventListener('change', async (event) => {
    // input 上传只处理第一张图片，后续阶段再扩展批量功能。
    const file = event.target.files?.[0];
    await handleFile(file);
    event.target.value = '';
  });

  dropzoneElement.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzoneElement.classList.add('is-dragover');
  });

  dropzoneElement.addEventListener('dragleave', () => {
    dropzoneElement.classList.remove('is-dragover');
  });

  dropzoneElement.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropzoneElement.classList.remove('is-dragover');

    // 拖拽上传可能包含多个文件，这里自动取第一张图片。
    const file = getImageFileFromList(event.dataTransfer.files);
    await handleFile(file);
  });
}
