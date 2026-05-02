export const COMPRESSION_PRESETS = [
  {
    key: 'high',
    label: '高清',
    hint: '尽量保留细节',
    maxBytes: 500 * 1024,
    minQuality: 0.9,
    maxQuality: 0.95,
  },
  {
    key: 'balanced',
    label: '标准',
    hint: '推荐，大多数场景够用',
    maxBytes: 300 * 1024,
    minQuality: 0.82,
    maxQuality: 0.9,
  },
  {
    key: 'small',
    label: '较小',
    hint: '适合表单上传限制',
    maxBytes: 150 * 1024,
    minQuality: 0.7,
    maxQuality: 0.82,
  },
  {
    key: 'tiny',
    label: '超小',
    hint: '优先压缩体积',
    maxBytes: 80 * 1024,
    minQuality: 0.55,
    maxQuality: 0.72,
  },
];

export const FILE_SIZE_LIMITS = [20, 50, 100];

export function getCompressionPresetByKey(key) {
  return COMPRESSION_PRESETS.find((preset) => preset.key === key) || COMPRESSION_PRESETS[1];
}

export function buildLimitCompressionOption(limitKb) {
  const numericLimitKb = Number(limitKb);

  if (!Number.isFinite(numericLimitKb) || numericLimitKb <= 0) {
    return null;
  }

  const maxBytes = Math.round(numericLimitKb * 1024);

  return {
    key: `limit-${numericLimitKb}`,
    label: `小于 ${numericLimitKb}KB`,
    hint: '按文件体积上限压缩',
    maxBytes,
    minQuality: numericLimitKb <= 30 ? 0.45 : numericLimitKb <= 100 ? 0.55 : 0.62,
    maxQuality: 0.95,
  };
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('JPG 导出失败'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function compressCanvasToJpeg(canvas, option) {
  let bestBlob = await canvasToJpegBlob(canvas, option.maxQuality);

  if (bestBlob.size <= option.maxBytes) {
    return bestBlob;
  }

  let low = option.minQuality;
  let high = option.maxQuality;

  // 使用二分法逼近目标体积，兼顾速度和最终质量。
  for (let index = 0; index < 8; index += 1) {
    const quality = Number(((low + high) / 2).toFixed(3));
    const candidateBlob = await canvasToJpegBlob(canvas, quality);

    if (candidateBlob.size <= option.maxBytes) {
      bestBlob = candidateBlob;
      low = quality;
    } else {
      high = quality;
    }
  }

  if (bestBlob.size > option.maxBytes) {
    return canvasToJpegBlob(canvas, option.minQuality);
  }

  return bestBlob;
}
