function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No se pudo leer el PDF."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("No se pudo convertir el PDF."));
    };

    reader.readAsDataURL(file);
  });
}

export async function parsePDFToBase64(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("El archivo seleccionado no es un PDF válido.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const [, base64] = dataUrl.split(",");

  if (!base64) {
    throw new Error("No se pudo obtener el contenido base64 del PDF.");
  }

  return base64;
}
