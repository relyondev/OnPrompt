import { PromptAttachment } from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function driveRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message || body?.error?.errors?.[0]?.message || '';
    } catch {
      detail = await response.text().catch(() => '');
    }
    if (response.status === 401) throw new Error('Your Google Drive connection expired. Reconnect Google Drive and try again.');
    if (response.status === 403 && detail.toLowerCase().includes('api has not been used')) throw new Error('Google Drive API is not enabled for this project. Enable it in Google Cloud, then reconnect Google Drive.');
    if (response.status === 403) throw new Error(`Google Drive denied access${detail ? `: ${detail}` : '. Check the Drive API and OAuth consent settings.'}`);
    throw new Error(`Google Drive request failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return response.json() as Promise<T>;
}

async function getOrCreateAppFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name = 'On Prompt' and mimeType = '${FOLDER_MIME}' and trashed = false`);
  const existing = await driveRequest<{ files: Array<{ id: string }> }>(`${DRIVE_API}?q=${query}&spaces=drive&fields=files(id)`, token);
  if (existing.files[0]?.id) return existing.files[0].id;
  const folder = await driveRequest<{ id: string }>(DRIVE_API, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'On Prompt', mimeType: FOLDER_MIME }),
  });
  return folder.id;
}

export async function uploadImageToDrive(file: File, promptId: string, token: string): Promise<PromptAttachment> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be smaller than 10 MB.');

  const folderId = await getOrCreateAppFolder(token);
  const boundary = `prompt-manager-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: `${promptId}-${file.name}`,
    mimeType: file.type,
    parents: [folderId],
    description: `On Prompt attachment for prompt ${promptId}`,
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`, file,
    `\r\n--${boundary}--`,
  ]);

  const uploaded = await driveRequest<{ id: string; name: string; mimeType: string; size?: string; webViewLink?: string }>(`${UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,webViewLink`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  return { id: uploaded.id, name: uploaded.name, mimeType: uploaded.mimeType, size: Number(uploaded.size || file.size), driveFileId: uploaded.id, webViewLink: uploaded.webViewLink };
}

export async function loadDriveImage(fileId: string, token: string): Promise<string> {
  const response = await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to load image (${response.status})`);
  return URL.createObjectURL(await response.blob());
}
