/**
 * PWA Icon Generator
 * Generates all required PWA icons from icon.svg
 * Run with: bun run scripts/generate-pwa-icons.ts
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ICON_SIZES = {
  // Apple Touch Icons
  "apple-touch-icon-120.png": 120,
  "apple-touch-icon-152.png": 152,
  "apple-touch-icon-167.png": 167,
  "apple-touch-icon-180.png": 180,
  // PWA Icons
  "pwa-icon-192.png": 192,
  "pwa-icon-512.png": 512,
  // Maskable icons (with 10% safe zone padding)
  "pwa-icon-maskable-192.png": 192,
  "pwa-icon-maskable-512.png": 512,
};

const PUBLIC_DIR = join(process.cwd(), "public");
const SVG_PATH = join(process.cwd(), "app", "icon.svg");
const APPLE_ICON_PATH = join(process.cwd(), "app", "apple-touch-icon.png");

async function generateIcons() {
  console.log("🎨 Generating PWA icons...\n");

  // Check if sharp is available
  let sharp: typeof import("sharp") | null = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("⚠️  sharp not installed. Installing...");
    execSync("bun add -d sharp", { stdio: "inherit" });
    sharp = (await import("sharp")).default;
  }

  if (!sharp) {
    console.error("❌ Could not load sharp. Please install it manually: bun add -d sharp");
    process.exit(1);
  }

  // Read the SVG
  const svgBuffer = readFileSync(SVG_PATH);

  // Generate each icon
  for (const [filename, size] of Object.entries(ICON_SIZES)) {
    const outputPath = join(PUBLIC_DIR, filename);
    const isMaskable = filename.includes("maskable");
    const isAppleIcon = filename.startsWith("apple-touch-icon");

    try {
      if (isMaskable) {
        // Maskable icons need 10% padding on each side (safe zone)
        // Icon content should be 80% of the total size
        const padding = Math.round(size * 0.1);
        const iconSize = size - padding * 2;

        // Create icon with padding for maskable
        const iconBuffer = await sharp(svgBuffer)
          .resize(iconSize, iconSize, { fit: "contain", background: { r: 4, g: 7, b: 17, alpha: 1 } })
          .png()
          .toBuffer();

        // Extend with padding
        await sharp(iconBuffer)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 4, g: 7, b: 17, alpha: 1 }, // #040711
          })
          .png()
          .toFile(outputPath);
      } else if (isAppleIcon) {
        // Apple icons should have a solid white background
        await sharp(svgBuffer)
          .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toFile(outputPath);
      } else {
        // Regular PWA icons - transparent background
        await sharp(svgBuffer)
          .resize(size, size, { fit: "contain" })
          .png()
          .toFile(outputPath);
      }

      console.log(`✅ Generated ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${filename}:`, error);
    }
  }

  // Copy apple-touch-icon.png from app to public if it exists
  if (existsSync(APPLE_ICON_PATH)) {
    const destPath = join(PUBLIC_DIR, "apple-touch-icon.png");
    const iconBuffer = readFileSync(APPLE_ICON_PATH);
    writeFileSync(destPath, iconBuffer);
    console.log(`✅ Copied apple-touch-icon.png to public`);
  }

  // Also copy icon.svg to public for direct access
  const publicSvgPath = join(PUBLIC_DIR, "icon.svg");
  writeFileSync(publicSvgPath, svgBuffer);
  console.log(`✅ Copied icon.svg to public`);

  console.log("\n🎉 PWA icons generated successfully!");
  console.log("\nGenerated icons:");
  Object.entries(ICON_SIZES).forEach(([filename, size]) => {
    console.log(`  - ${filename} (${size}x${size})`);
  });
}

generateIcons().catch(console.error);

