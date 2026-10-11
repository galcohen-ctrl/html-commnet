export function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function isVisible(element) {
  if (!element?.isConnected) return false;
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== 'none' &&
    styles.visibility !== 'hidden'
  );
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function extensionForMimeType(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'png';
}

export async function readJsonResponse(response, label) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${label} (${response.status}): ${payload.message || 'Request failed'}`);
  }
  return payload;
}
