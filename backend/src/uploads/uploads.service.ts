import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs, existsSync } from 'fs';
import { dirname, join } from 'path';

// Reference stockee en base: "private:cartes/<userId>_<uuid>.<ext>"
const REF = /^private:(cartes\/([0-9a-f-]{36})_[0-9a-f-]{36}\.(jpg|png|webp))$/;
const MAX_BYTES = 5 * 1024 * 1024;

const MIMES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Type reel du fichier d'apres son contenu (et non son nom ou son Content-Type declare)
function detectExt(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

// Stockage local PRIVE (jamais servi en statique). Remplacable par un stockage objet
// prive (S3, Supabase, Firebase Storage) sans changer les appelants.
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly root = join(process.env.UPLOAD_DIR || join(process.cwd(), 'storage'), 'private');

  async saveCarte(userId: string, file: { buffer?: Buffer; size?: number } | undefined): Promise<string> {
    if (!file || !file.buffer || !file.buffer.length) throw new BadRequestException('Fichier manquant (champ "file")');
    if (file.buffer.length > MAX_BYTES) throw new BadRequestException('Fichier trop volumineux (5 Mo max)');
    const ext = detectExt(file.buffer);
    if (!ext) throw new BadRequestException('Format non supporté (JPEG, PNG ou WebP uniquement)');

    const key = `cartes/${userId}_${randomUUID()}.${ext}`;
    const full = join(this.root, key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer, { mode: 0o600 });
    return `private:${key}`;
  }

  // La reference doit etre bien formee, appartenir a l'utilisateur et exister
  ownsCarte(userId: string, ref: string): boolean {
    const m = REF.exec(ref || '');
    if (!m || m[2] !== userId) return false;
    return existsSync(join(this.root, m[1]));
  }

  async read(ref: string): Promise<{ buffer: Buffer; mime: string }> {
    const m = REF.exec(ref || '');
    if (!m) throw new NotFoundException('Fichier introuvable');
    try {
      const buffer = await fs.readFile(join(this.root, m[1]));
      return { buffer, mime: MIMES[m[3]] };
    } catch {
      throw new NotFoundException('Fichier introuvable (déjà supprimé après décision)');
    }
  }

  async deleteQuietly(ref: string | null | undefined): Promise<void> {
    const m = REF.exec(ref || '');
    if (!m) return;
    try {
      await fs.unlink(join(this.root, m[1]));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Suppression impossible: ${(e as Error).message}`);
      }
    }
  }
}