import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile, rename, rm } from 'node:fs/promises';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageDirectory = path.join(projectRoot, 'src', 'assets', 'images');

const images = [
  ['hero_reading_adventure_1795046657309', 1200, 896],
  ['quest_phonics_forest_1795046657223', 800, 597],
  ['quest_blending_beach_1795046658152', 800, 597],
  ['quest_sight_word_galaxy_1795046658135', 800, 597],
  ['quest_storybook_kingdom_1795046659843', 800, 597],
  ['mascot_quill_buddy_1795046659465', 160, 160],
];

await Promise.all(
  images.map(async ([name, width, height]) => {
    const outputPath = path.join(imageDirectory, `${name}.webp`);
    const inputPath = existsSync(path.join(imageDirectory, `${name}.jpg`))
      ? path.join(imageDirectory, `${name}.jpg`)
      : outputPath;
    const temporaryPath = `${outputPath}.tmp`;

    await sharp(await readFile(inputPath))
      .resize(width, height, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(temporaryPath);
    await rm(outputPath, { force: true });
    await rename(temporaryPath, outputPath);
  }),
);
