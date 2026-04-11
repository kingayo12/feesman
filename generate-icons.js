import sharp from "sharp";
import fs from "fs";

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const source = "./public/logo.svg"; // Replace with your logo

async function generateIcons() {
  for (const size of sizes) {
    await sharp(source)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(`public/icon-${size}.png`);

    // Maskable variants for 192 and 512
    if (size === 192 || size === 512) {
      const innerSize = Math.round(size * 0.8);
      const padding = Math.round(size * 0.1);
      await sharp(source)
        .resize(innerSize, innerSize, { fit: "inside" })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(`public/icon-${size}-maskable.png`);
    }
  }
  console.log("Icons generated successfully!");
}

generateIcons().catch(console.error);
