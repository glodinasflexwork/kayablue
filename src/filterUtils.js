// Pixel-based filter utilities for reliable image filtering

export function applyFiltersToCanvas(canvas, img, filters) {
  const { brightness, contrast, saturation, grayscale, sepia, blur } = filters;
  const ctx = canvas.getContext('2d');
  
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  
  // Draw the original image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply filters pixel by pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply brightness
    if (brightness !== 100) {
      const factor = brightness / 100;
      r *= factor;
      g *= factor;
      b *= factor;
    }
    
    // Apply contrast
    if (contrast !== 100) {
      const factor = contrast / 100;
      r = ((r / 255 - 0.5) * factor + 0.5) * 255;
      g = ((g / 255 - 0.5) * factor + 0.5) * 255;
      b = ((b / 255 - 0.5) * factor + 0.5) * 255;
    }
    
    // Apply saturation
    if (saturation !== 100) {
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      const factor = saturation / 100;
      r = gray + factor * (r - gray);
      g = gray + factor * (g - gray);
      b = gray + factor * (b - gray);
    }
    
    // Apply grayscale
    if (grayscale > 0) {
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      const factor = grayscale / 100;
      r = r + factor * (gray - r);
      g = g + factor * (gray - g);
      b = b + factor * (gray - b);
    }
    
    // Apply sepia
    if (sepia > 0) {
      const factor = sepia / 100;
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r + factor * (tr - r);
      g = g + factor * (tg - g);
      b = b + factor * (tb - b);
    }
    
    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  
  // Put the modified pixel data back
  ctx.putImageData(imageData, 0, 0);
  
  // Apply blur using canvas filter (this one actually works)
  if (blur > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.filter = `blur(${blur}px)`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
  }
  
  return canvas;
}

