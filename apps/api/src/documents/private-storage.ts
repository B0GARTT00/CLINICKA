export const PRIVATE_STORAGE = Symbol('PRIVATE_STORAGE');

export interface PrivateStorageAdapter {
  put(key: string, content: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const DOCUMENT_MIME_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

export const MAX_PRIVATE_DOCUMENT_BYTES = 5 * 1024 * 1024;

export function validateDocumentContent(mimeType: string, content: Buffer) {
  if (!DOCUMENT_MIME_TYPES.has(mimeType)) return false;
  if (content.length === 0 || content.length > MAX_PRIVATE_DOCUMENT_BYTES) return false;
  if (mimeType === 'application/pdf') return content.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'image/png') return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return content[0] === 0xff && content[1] === 0xd8 && content[content.length - 2] === 0xff && content[content.length - 1] === 0xd9;
}
