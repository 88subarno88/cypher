const PREFIX = "avatar:";

export function saveAvatar(userId: string, dataUrl: string): void {
  try {
    localStorage.setItem(PREFIX + userId, dataUrl);
  } catch (err) {
    console.error("Avatar too large to store:", err);
  }
}

export function getAvatar(userId: string): string | null {
  return localStorage.getItem(PREFIX + userId);
}

// Resize an uploaded image to max 256px and return a Base64 data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 256;
        let { width, height } = img;
        if (width > height && width > MAX) {
          height = (height * MAX) / width;
          width = MAX;
        } else if (height > MAX) {
          width = (width * MAX) / height;
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
