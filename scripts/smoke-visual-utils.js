const fs = require("node:fs");
const zlib = require("node:zlib");

function paethPredictor(left, up, upperLeft) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filterMethod = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.toString("ascii", offset, offset + 4);
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      compression = data[10];
      filterMethod = data[11];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType) || compression !== 0 || filterMethod !== 0 || interlace !== 0) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
  }
  if (!width || !height || !idatChunks.length) {
    throw new Error(`Invalid PNG data: ${filePath}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedBytes = (rowBytes + 1) * height;
  if (inflated.length < expectedBytes) {
    throw new Error(`Truncated PNG data: expected ${expectedBytes} bytes, got ${inflated.length}`);
  }

  const pixels = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(rowBytes);
  let current = Buffer.alloc(rowBytes);
  let readOffset = 0;
  let writeOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset];
    readOffset += 1;
    const raw = inflated.subarray(readOffset, readOffset + rowBytes);
    readOffset += rowBytes;

    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      let predictor = 0;

      if (filter === 1) {
        predictor = left;
      } else if (filter === 2) {
        predictor = up;
      } else if (filter === 3) {
        predictor = Math.floor((left + up) / 2);
      } else if (filter === 4) {
        predictor = paethPredictor(left, up, upperLeft);
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter: ${filter}`);
      }

      current[x] = (raw[x] + predictor) & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      pixels[writeOffset] = current[source];
      pixels[writeOffset + 1] = current[source + 1];
      pixels[writeOffset + 2] = current[source + 2];
      pixels[writeOffset + 3] = channels === 4 ? current[source + 3] : 255;
      writeOffset += 4;
    }

    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }

  return { width, height, pixels };
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function samplePixel(image, x, y) {
  const index = ((y * image.width) + x) * 4;
  return [
    image.pixels[index],
    image.pixels[index + 1],
    image.pixels[index + 2],
    image.pixels[index + 3]
  ];
}

function isLightMintPixel(r, g, b, a) {
  return a > 180 && r >= 188 && g >= 205 && b >= 188 && g >= r - 6 && g >= b - 6;
}

function isDarkPrimaryButtonPixel(r, g, b, a) {
  return a > 180 && r <= 46 && g <= 68 && b <= 64 && g >= r && b >= r - 4;
}

function isLightButtonTextPixel(r, g, b, a) {
  return a > 180 && r >= 215 && g >= 225 && b >= 218 && Math.max(r, g, b) - Math.min(r, g, b) <= 34;
}

function findLargestComponent(image, bounds, pixelMatcher, componentMatcher = () => true) {
  const left = Math.max(0, Math.floor(bounds.left));
  const right = Math.min(image.width, Math.ceil(bounds.right));
  const top = Math.max(0, Math.floor(bounds.top));
  const bottom = Math.min(image.height, Math.ceil(bounds.bottom));
  const regionWidth = right - left;
  const regionHeight = bottom - top;
  if (regionWidth <= 0 || regionHeight <= 0) return null;

  const mask = new Uint8Array(regionWidth * regionHeight);
  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      const pixel = samplePixel(image, left + x, top + y);
      if (pixelMatcher(...pixel)) {
        mask[(y * regionWidth) + x] = 1;
      }
    }
  }

  const stack = [];
  let best = null;
  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      const start = (y * regionWidth) + x;
      if (mask[start] !== 1) continue;

      mask[start] = 2;
      stack.push(start);
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (stack.length) {
        const currentIndex = stack.pop();
        const currentX = currentIndex % regionWidth;
        const currentY = Math.floor(currentIndex / regionWidth);
        area += 1;
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;

        const neighbors = [
          currentIndex - 1,
          currentIndex + 1,
          currentIndex - regionWidth,
          currentIndex + regionWidth
        ];
        for (const next of neighbors) {
          if (next < 0 || next >= mask.length || mask[next] !== 1) continue;
          if ((next === currentIndex - 1 && currentX === 0) || (next === currentIndex + 1 && currentX === regionWidth - 1)) continue;
          mask[next] = 2;
          stack.push(next);
        }
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fillRatio = area / (boxWidth * boxHeight);
      const candidate = {
        area,
        minX: left + minX,
        maxX: left + maxX,
        minY: top + minY,
        maxY: top + maxY,
        boxWidth,
        boxHeight,
        fillRatio,
        aspectRatio: boxWidth / boxHeight
      };
      if (componentMatcher(candidate) && (!best || area > best.area)) best = candidate;
    }
  }

  return best;
}

function assertOnboardingPrimaryActionVisible(image) {
  const isButtonShape = (candidate) => candidate.area > image.width * image.height * 0.0012
    && candidate.boxWidth > image.width * 0.075
    && candidate.boxWidth < image.width * 0.24
    && candidate.boxHeight > image.height * 0.026
    && candidate.boxHeight < image.height * 0.09
    && candidate.aspectRatio > 2.2
    && candidate.fillRatio > 0.42;
  const candidate = findLargestComponent(image, {
    left: image.width * 0.22,
    right: image.width * 0.58,
    top: image.height * 0.48,
    bottom: image.height * 0.96
  }, isDarkPrimaryButtonPixel, isButtonShape);
  if (!candidate) {
    throw new Error("onboarding primary action button was not detected in the visible lower area");
  }

  const isButtonLike = isButtonShape(candidate);
  if (!isButtonLike) {
    throw new Error(`onboarding primary action has unexpected shape (dark=${candidate.area}, box=${candidate.boxWidth}x${candidate.boxHeight}, fill=${candidate.fillRatio.toFixed(2)})`);
  }

  let lightTextPixels = 0;
  let buttonLum = 0;
  let textLum = 0;
  for (let y = candidate.minY; y <= candidate.maxY; y += 1) {
    for (let x = candidate.minX; x <= candidate.maxX; x += 1) {
      const [r, g, b, a] = samplePixel(image, x, y);
      if (isDarkPrimaryButtonPixel(r, g, b, a)) {
        buttonLum += luminance(r, g, b);
      } else if (isLightButtonTextPixel(r, g, b, a)) {
        lightTextPixels += 1;
        textLum += luminance(r, g, b);
      }
    }
  }

  const averageButton = buttonLum / Math.max(1, candidate.area);
  const averageText = textLum / Math.max(1, lightTextPixels);
  const contrast = averageText - averageButton;
  const minimumTextPixels = Math.max(180, Math.floor(candidate.area * 0.018));
  const diagnostics = `dark=${candidate.area}, text=${lightTextPixels}, contrast=${contrast.toFixed(1)}, box=${candidate.boxWidth}x${candidate.boxHeight}`;
  if (lightTextPixels < minimumTextPixels || contrast < 145) {
    throw new Error(`onboarding primary action text is not readable enough (${diagnostics})`);
  }

  return diagnostics;
}

function assertOnboardingVisualQualityImage(image) {
  return {
    action: assertOnboardingPrimaryActionVisible(image)
  };
}

function assertOnboardingVisualQuality(filePath) {
  return assertOnboardingVisualQualityImage(readPng(filePath));
}

module.exports = {
  assertOnboardingVisualQualityImage,
  assertOnboardingVisualQuality
};
