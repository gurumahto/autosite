import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function getLocalRoot() {
  return path.resolve(process.env.LOCAL_STORAGE_ROOT || '.local-storage');
}

export async function putObject(key, content) {
  if ((process.env.STORAGE_PROVIDER || 'local') !== 'local') {
    throw new Error('STORAGE_PROVIDER_NOT_IMPLEMENTED');
  }

  const root = getLocalRoot();
  const destination = path.resolve(root, key);
  if (!destination.startsWith(`${root}${path.sep}`)) {
    throw new Error('INVALID_STORAGE_KEY');
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, { flag: 'wx' });
  return key;
}
