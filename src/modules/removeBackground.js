import { removeBackground } from '@imgly/background-removal';

const backgroundRemovalConfig = {
  // 选择较小的量化模型，首次下载约 40MB，更适合 GitHub Pages 首阶段体验。
  model: 'isnet_quint8',
  output: {
    format: 'image/png',
    type: 'foreground',
  },
};

export async function removePhotoBackground(file) {
  try {
    // @imgly/background-removal 在浏览器本地运行，返回带透明通道的 PNG Blob。
    const resultBlob = await removeBackground(file, backgroundRemovalConfig);

    // 统一转换为 ImageBitmap，方便后续裁剪、换底色、排版等功能继续复用。
    return await createImageBitmap(resultBlob);
  } catch (error) {
    console.error('@imgly/background-removal 执行失败：', error);
    throw new Error('背景移除失败');
  }
}
