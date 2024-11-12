import imagemin from "imagemin";
import imageminWebp from "imagemin-webp";
import imageminPng from "imagemin-optipng";
import imageminJpegtran from "imagemin-jpegtran";
import imageminGif from "imagemin-gifsicle";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminAvif from "imagemin-avif";
import imageminSvgo from "imagemin-svgo";

import path from "path";
import fs from "fs";

const ALLOWED_FILES = ["jpeg", "jpg", "png", "svg", "gif"];
const INPUT_PATH = path.join(process.cwd(), "src", "input");
const OUTPUT_PATH = path.join(process.cwd(), "src", "output");
const TEMP_FOLDER = path.join(process.cwd(), "temp");
const TEMP_ORIGINAL_FILES = path.resolve(TEMP_FOLDER, "original");
const TEMP_PROCESSED_FILES = path.resolve(TEMP_FOLDER, "processed");

(async () => {
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true });
  }

  const baseImages = fs
    .readdirSync(INPUT_PATH)
    .filter((file) => ALLOWED_FILES.some((rule) => file.includes(rule)))
    .map((filename) => ({
      origin: path.resolve(INPUT_PATH, filename),
      destination: path.resolve(TEMP_ORIGINAL_FILES, filename),
    }));

  if (!fs.existsSync(path.resolve(TEMP_ORIGINAL_FILES))) {
    fs.mkdirSync(path.resolve(TEMP_ORIGINAL_FILES), { recursive: true });
  }

  baseImages.forEach((file) => fs.copyFileSync(file.origin, file.destination));

  if (!fs.existsSync(TEMP_PROCESSED_FILES)) {
    fs.mkdirSync(TEMP_PROCESSED_FILES, { recursive: true });
  }

  const inputFiles = TEMP_ORIGINAL_FILES.concat(
    `/*.{${ALLOWED_FILES.join(",")}}`
  );

  await imagemin([inputFiles], {
    destination: TEMP_PROCESSED_FILES,
    plugins: [imageminAvif({ quality: 50 })],
  });

  fs.readdirSync(TEMP_PROCESSED_FILES).forEach((file) => {
    const newFilenameArray = file.split(".");
    const oldExtension = newFilenameArray.pop();

    if (oldExtension === "svg" || oldExtension === "gif") return;

    const newFilename = newFilenameArray.join("").concat(".avif");
    const oldPath = path.resolve(TEMP_PROCESSED_FILES, file);
    const newPath = path.resolve(TEMP_PROCESSED_FILES, newFilename);

    fs.renameSync(oldPath, newPath);
  });

  await imagemin([inputFiles], {
    destination: TEMP_PROCESSED_FILES,
    plugins: [imageminWebp({ quality: 70 })],
  });

  await imagemin([inputFiles], {
    destination: TEMP_PROCESSED_FILES,
    plugins: [
      imageminMozjpeg({
        quality: 75,
        progressive: true,
        optimizationLevel: 4,
        interlaced: false,
      }),
      imageminJpegtran({ progressive: true }),
      imageminPng({ optimizationLevel: 5 }),
      imageminPngquant({ quality: [0.6, 0.8] }),
      imageminSvgo({
        plugins: [
          {
            name: "removeViewBox",
            active: false,
          },
        ],
      }),
      imageminGif({ interlaced: true, optimizationLevel: 1 }),
    ],
  });

  baseImages.forEach((file) => {
    fs.rmSync(file.origin, { recursive: true });
  });

  const processedFiles = fs.readdirSync(TEMP_PROCESSED_FILES);

  processedFiles.forEach((filename) => {
    const oldPath = path.resolve(TEMP_PROCESSED_FILES, filename);
    const newPath = path.resolve(OUTPUT_PATH, filename);

    fs.copyFileSync(oldPath, newPath);
  });

  fs.rmSync(TEMP_FOLDER, { recursive: true });
})();
