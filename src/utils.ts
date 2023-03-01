import { opendir } from 'fs/promises';

export async function isEmptyDir(path: string) {
  try {
    const dirent = await opendir(path);
    const value = await dirent.read();
    await dirent.close();

    return value === null;
  } catch (error) {
    return false;
  }
}
