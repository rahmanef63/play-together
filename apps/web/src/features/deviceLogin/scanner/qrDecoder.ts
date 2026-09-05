import jsQR from "jsqr";
export function decodeQrImage(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | null {
  if (!width || !height || width > 16_384 || height > 16_384) throw new Error("IMAGE_SIZE");
  const scale = Math.min(1, 960 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("IMAGE_UNSUPPORTED");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return (
    jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "dontInvert" })?.data ??
    null
  );
}
export async function decodeQrFile(file: File): Promise<string | null> {
  if (file.size > 12 * 1024 * 1024 || !/^image\/(?:jpeg|png|webp|heic|heif)$/.test(file.type))
    throw new Error("IMAGE_UNSUPPORTED");
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("IMAGE_UNSUPPORTED"));
      image.src = url;
    });
    return decodeQrImage(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
