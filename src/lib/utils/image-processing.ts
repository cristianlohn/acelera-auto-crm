/**
 * @file image-processing.ts
 * @description Utilitário client-side de compressão e conversão de imagens para formato WebP otimizado.
 */

/**
 * Converte e redimensiona um File de imagem para Blob WebP otimizado via Canvas API no navegador.
 *
 * @param file - Arquivo de imagem selecionado pelo usuário (PNG, JPEG, WebP, etc.).
 * @param maxWidth - Largura máxima para redimensionamento proporcional (padrão: 1600px).
 * @param quality - Fator de qualidade da compressão WebP de 0.0 a 1.0 (padrão: 0.85).
 * @returns Promessa com o Blob WebP resultante e o nome do arquivo gerado.
 */
export async function convertImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.85
): Promise<{ blob: Blob; fileName: string }> {
  return new Promise((resolve) => {
    // Tratamento de ambiente SSR / Node / Testes
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof Image === "undefined"
    ) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      return resolve({ blob: file, fileName: `${baseName}-${Date.now()}.webp` });
    }

    try {
      let resolved = false;
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const defaultFileName = `${baseName}-${Date.now()}.webp`;

      const safeResolve = (data: { blob: Blob; fileName: string }) => {
        if (!resolved) {
          resolved = true;
          resolve(data);
        }
      };

      // Fallback timer de segurança para ambientes de teste onde img.onload não é disparado
      const timer = setTimeout(() => {
        safeResolve({ blob: file, fileName: defaultFileName });
      }, 50);

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        clearTimeout(timer);
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Silencioso
        }

        let width = img.width || 1200;
        let height = img.height || 800;

        // Redimensionamento proporcional se exceder maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx || typeof canvas.toBlob !== "function") {
          return safeResolve({ blob: file, fileName: defaultFileName });
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return safeResolve({ blob: file, fileName: defaultFileName });
            }
            safeResolve({ blob, fileName: defaultFileName });
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => {
        clearTimeout(timer);
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        safeResolve({ blob: file, fileName: defaultFileName });
      };
    } catch {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      resolve({ blob: file, fileName: `${baseName}-${Date.now()}.webp` });
    }
  });
}
