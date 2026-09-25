import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import { PrivateStorageAdapter } from './private-storage';

@Injectable()
export class LocalPrivateStorageAdapter implements PrivateStorageAdapter {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('privateStorage.root') || resolve(process.cwd(), 'private-storage'));
  }

  async put(key: string, content: Buffer) {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
  }

  async get(key: string) {
    return readFile(this.resolveKey(key)).catch(() => { throw new NotFoundException('Private document file is unavailable.'); });
  }

  async delete(key: string) {
    await unlink(this.resolveKey(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private resolveKey(key: string) {
    const path = resolve(this.root, key);
    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) throw new Error('Invalid private storage key.');
    return path;
  }
}
