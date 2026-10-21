import { Prompt, Project, Category, PromptAttachment, PromptVariants } from '../types';
import { loadDriveImage, uploadImageToDrive } from './googleDriveService';

type PackManifest = {
  version: 1;
  exportedAt: string;
  projects: Project[];
  categories: Category[];
  tags: string[];
  prompts: Array<Prompt & { packFiles: Record<string, string> }>;
};

export type ImportedPrompt = {
  prompt: Prompt & { packFiles?: Record<string, string> };
  files: Map<string, Uint8Array>;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const safeName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'prompt';

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const u16 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255]);
const u32 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
const concat = (...parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach(part => { output.set(part, offset); offset += part.length; });
  return output;
};

const zipStore = (files: Array<{ name: string; data: Uint8Array }>) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach(file => {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concat(u32(0x04034b50), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data);
    localParts.push(local);
    centralParts.push(concat(u32(0x02014b50), u16(20), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name));
    offset += local.length;
  });
  const central = concat(...centralParts);
  const local = concat(...localParts);
  return new Blob([concat(local, central, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(local.length), u16(0))], { type: 'application/zip' });
};

const markdownFor = (prompt: Prompt, format: keyof PromptVariants, body: string) => `# ${prompt.title}\n\n- Prompt type: ${prompt.promptType || 'TXT_TO_TXT'}\n- Version: ${format}\n- Category: ${prompt.category || 'Uncategorized'}\n- Tags: ${(prompt.tags || []).map(tag => `#${tag}`).join(', ') || 'None'}\n- Tested models: ${(prompt.testedModels || (prompt.testedModel ? [prompt.testedModel] : [])).join(', ') || 'None'}\n\n${body}\n`;

export async function exportPromptsToZip(prompts: Prompt[], projects: Project[], categories: Category[], tags: string[], driveAccessToken?: string | null): Promise<Blob> {
  const files: Array<{ name: string; data: Uint8Array }> = [];
  const manifest: PackManifest = { version: 1, exportedAt: new Date().toISOString(), projects, categories, tags, prompts: [] };

  for (const prompt of prompts) {
    const base = `prompts/${safeName(prompt.title)}-${prompt.id}`;
    const packFiles: Record<string, string> = {};
    const variants = prompt.promptVariants || { general: prompt.content || '', json: '', structured: '' };
    (['general', 'json', 'structured'] as const).forEach(format => {
      if (variants[format]?.trim()) {
        const path = `${base}/${format}.md`;
        packFiles[format] = path;
        files.push({ name: path, data: encoder.encode(markdownFor(prompt, format, variants[format])) });
      }
    });
    for (const attachment of prompt.attachments || []) {
      if (!driveAccessToken) throw new Error('Connect Google Drive before exporting prompts with images.');
      const path = `${base}/${attachment.role === 'reference' ? 'reference' : 'result'}/${safeName(attachment.name)}`;
      const url = await loadDriveImage(attachment.driveFileId, driveAccessToken);
      try {
        const response = await fetch(url);
        files.push({ name: path, data: new Uint8Array(await response.arrayBuffer()) });
        packFiles[`attachment:${attachment.id}`] = path;
      } finally { URL.revokeObjectURL(url); }
    }
    manifest.prompts.push({ ...prompt, packFiles });
  }
  files.unshift({ name: 'manifest.json', data: encoder.encode(JSON.stringify(manifest, null, 2)) });
  return zipStore(files);
}

const readU16 = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8);
const readU32 = (bytes: Uint8Array, at: number) => (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

export async function readPromptPack(file: File): Promise<{ manifest: PackManifest; prompts: ImportedPrompt[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) if (readU32(bytes, index) === 0x06054b50) { end = index; break; }
  if (end < 0) throw new Error('That file is not a valid prompt ZIP pack.');
  const count = readU16(bytes, end + 10);
  const centralOffset = readU32(bytes, end + 16);
  const entries = new Map<string, Uint8Array>();
  let cursor = centralOffset;
  for (let index = 0; index < count; index++) {
    if (readU32(bytes, cursor) !== 0x02014b50) throw new Error('The prompt ZIP pack is corrupted.');
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (method !== 0) throw new Error('This prompt pack uses an unsupported compression format.');
    const localNameLength = readU16(bytes, localOffset + 26);
    const localExtraLength = readU16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const manifestFile = entries.get('manifest.json');
  if (!manifestFile) throw new Error('The prompt pack is missing its manifest.');
  const manifest = JSON.parse(decoder.decode(manifestFile)) as PackManifest;
  const prompts = manifest.prompts.map(prompt => ({ prompt, files: new Map(Object.values(prompt.packFiles || {}).map(path => [path, entries.get(path)]).filter((item): item is [string, Uint8Array] => Boolean(item[1]))) }));
  return { manifest, prompts };
}

export async function uploadImportedAttachment(file: Uint8Array, name: string, mimeType: string, promptId: string, role: PromptAttachment['role'], token: string): Promise<PromptAttachment> {
  return { ...(await uploadImageToDrive(new File([file], name, { type: mimeType }), promptId, token)), role };
}
