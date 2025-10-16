
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Upload, Download, RotateCw, Crop, Maximize, Palette, Archive, FileImage, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import ReactCrop, { centerCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [activeTool, setActiveTool] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [grayscale, setGrayscale] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [blur, setBlur] = useState(0)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [isProcessing, setIsProcessing] = useState(false)
  const imgRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const filterCanvasRef = useRef(null)

  // Toast notification helper
  const showToast = (message) => {
    setToast({ show: true, message })
    setTimeout(() => {
      setToast({ show: false, message: '' })
    }, 3000)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setProcessedImage(event.target.result)
        setActiveTool(null)
        setRotation(0)
        setCrop(undefined) // Clear crop when new image is uploaded
        setCompletedCrop(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const rotateImage = (degrees, imgSource) => {
    if (!imgSource) return

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      const rad = (degrees * Math.PI) / 180
      const sin = Math.abs(Math.sin(rad))
      const cos = Math.abs(Math.cos(rad))
      
      canvas.width = img.width * cos + img.height * sin
      canvas.height = img.width * sin + img.height * cos

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(rad)
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height)

      setProcessedImage(canvas.toDataURL('image/png'))
    }
    img.src = imgSource
  }

  useEffect(() => {
    if (activeTool === 'rotate' && processedImage && imgRef.current) {
      // Only re-rotate if the rotation value changes, not when processedImage updates
      // The actual rotation logic will be triggered by a button click or slider change
      // For now, this useEffect will ensure the image is drawn with the current rotation
      // if the tool is active and image is loaded.
      // The continuous rotation was due to processedImage being a dependency and also being updated by rotateImage.
      // We need to ensure rotateImage is called explicitly when rotation changes, not implicitly by processedImage.
    }
  }, [rotation, activeTool]) // Removed processedImage from dependencies to prevent infinite loop

  // Function to apply rotation when the rotation state changes
  const applyRotation = () => {
    if (processedImage) {
      rotateImage(rotation, processedImage);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return

    const a = document.createElement('a')
    a.href = processedImage
    a.download = `kayablue-${activeTool || 'image'}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleReset = () => {
    setImage(null)
    setProcessedImage(null)
    setActiveTool(null)
    setRotation(0)
    setCrop(undefined)
    setCompletedCrop(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleToolChange = (toolId) => {
    setActiveTool(toolId)
    // IMPORTANT: Do NOT reset processedImage here. It should carry over.
    // Reset tool-specific states
    setRotation(0)
    setCrop(undefined)
    setCompletedCrop(null)
    setResizeWidth('')
    setResizeHeight('')
    setMaintainAspectRatio(true)
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setGrayscale(0)
    setSepia(0)
    setBlur(0)
  }

  // Cropping functions
  function onImageLoad(e) {
    imgRef.current = e.currentTarget
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget
    // Set original dimensions for resize tool
    setOriginalDimensions({ width: naturalWidth, height: naturalHeight })
    setResizeWidth(naturalWidth.toString())
    setResizeHeight(naturalHeight.toString())
    // Set initial crop to cover most of the image without a fixed aspect ratio
    // This will create a crop area that is 80% of the image width and height, centered.
    // Users can then freely adjust it.
    // Do not set an initial crop area. Let the user define it from scratch.
    setCrop(undefined)
  }

  // Resize function
  const performResize = () => {
    if (!processedImage || !resizeWidth || !resizeHeight) return

    setIsProcessing(true);
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = parseInt(resizeWidth)
      canvas.height = parseInt(resizeHeight)

      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      setProcessedImage(canvas.toDataURL('image/png'))
      // Update original dimensions to reflect the new size
      setOriginalDimensions({ width: canvas.width, height: canvas.height })
      setIsProcessing(false);
      showToast('Image resized successfully');
    }
    img.src = processedImage
  }

  // Function to perform the actual crop on the current processedImage
  const performCrop = () => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      setIsProcessing(true);
      
      setTimeout(() => {
        const imageElement = imgRef.current
        const canvas = previewCanvasRef.current
        const ctx = canvas.getContext('2d')

        const scaleX = imageElement.naturalWidth / imageElement.width
        const scaleY = imageElement.naturalHeight / imageElement.height

        const pixelRatio = window.devicePixelRatio

        canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
        canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

        ctx.scale(pixelRatio, pixelRatio)
        ctx.imageSmoothingQuality = 'high'

        const cropX = completedCrop.x * scaleX
        const cropY = completedCrop.y * scaleY

        ctx.drawImage(
          imageElement,
          cropX,
          cropY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY
        )
        setProcessedImage(canvas.toDataURL('image/png'))
        setIsProcessing(false);
        showToast('Image cropped successfully');
      }, 100);
    }
  }

  // This useEffect will now ensure that when the crop area is completed, it updates the processedImage
  // We will no longer automatically perform the crop here. The user must click 'Apply Crop'.
  // The `completedCrop` state is updated by `onComplete` from ReactCrop, which fires when the user finishes dragging.
  // The `crop` state is updated by `onChange`, which fires continuously as the user drags.
  // The `performCrop` function is explicitly called by the 'Apply Crop' button.
  useEffect(() => {
    // This useEffect is now primarily for debugging or if we need to react to completedCrop changes without applying it.
    // The actual crop application is triggered by the 'Apply Crop' button.
  }, [activeTool]); // Removed completedCrop from dependencies to prevent unintended side effects

  const tools = [
    { id: 'rotate', name: 'Rotate', icon: RotateCw, description: 'Rotate your image by any angle' },
    { id: 'crop', name: 'Crop', icon: Crop, description: 'Select and crop a specific area' },
    { id: 'resize', name: 'Resize', icon: Maximize, description: 'Change the dimensions' },
    { id: 'filters', name: 'Filters', icon: Palette, description: 'Adjust brightness, contrast, and more' },
    { id: 'compress', name: 'Compress', icon: Archive, description: 'Reduce file size' },
    { id: 'format', name: 'Format', icon: FileImage, description: 'Convert between formats' },
  ]

  const renderToolPanel = () => {
    switch (activeTool) {
      case 'rotate':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Rotation Angle: {rotation}°
              </label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => {
                  setRotation(value[0]);
                  rotateImage(value[0], processedImage); // Apply rotation immediately on slider change
                }}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  const newRotation = (rotation + 90) % 360;
                  setRotation(newRotation);
                  rotateImage(newRotation, processedImage); // Apply rotation immediately on button click
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                90° Right
              </Button>
              <Button
                onClick={() => {
                  const newRotation = (rotation - 90 + 360) % 360;
                  setRotation(newRotation);
                  rotateImage(newRotation, processedImage); // Apply rotation immediately on button click
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                90° Left
              </Button>
              <Button
                onClick={() => {
                  setRotation(180);
                  rotateImage(180, processedImage); // Apply rotation immediately on button click
                }}
                variant="outline"
                className="w-full"
              >
                180°
              </Button>
              <Button
                onClick={() => {
                  setRotation(0);
                  rotateImage(0, processedImage); // Apply rotation immediately on button click
                }}
                variant="outline"
                className="w-full"
              >
                Reset
              </Button>
            </div>
          </div>
        )

      case 'crop':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag to select the area you want to crop. Use the handles to adjust.
            </p>
            <Button
                onClick={() => {
                  if (completedCrop) {
                    performCrop();
                  }
                }} className="w-full">
              Apply Crop
            </Button>
          </div>
        )

      case 'resize':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter new dimensions for your image. Current size: {originalDimensions.width} × {originalDimensions.height}px
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Width (px)
                </label>
                <Input
                  type="number"
                  value={resizeWidth}
                  onChange={(e) => {
                    const newWidth = e.target.value
                    setResizeWidth(newWidth)
                    if (maintainAspectRatio && newWidth && originalDimensions.width > 0) {
                      const aspectRatio = originalDimensions.height / originalDimensions.width
                      setResizeHeight(Math.round(newWidth * aspectRatio).toString())
                    }
                  }}
                  placeholder="Width"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Height (px)
                </label>
                <Input
                  type="number"
                  value={resizeHeight}
                  onChange={(e) => {
                    const newHeight = e.target.value
                    setResizeHeight(newHeight)
                    if (maintainAspectRatio && newHeight && originalDimensions.height > 0) {
                      const aspectRatio = originalDimensions.width / originalDimensions.height
                      setResizeWidth(Math.round(newHeight * aspectRatio).toString())
                    }
                  }}
                  placeholder="Height"
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintainAspect"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="maintainAspect" className="text-sm text-gray-700 dark:text-gray-300">
                Maintain aspect ratio
              </label>
            </div>
            <Button onClick={performResize} className="w-full">
              Apply Resize
            </Button>
          </div>
        )

      case 'filters':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Brightness: {brightness}%
              </label>
              <Slider
                value={[brightness]}
                onValueChange={(value) => setBrightness(value[0])}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Contrast: {contrast}%
              </label>
              <Slider
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Saturation: {saturation}%
              </label>
              <Slider
                value={[saturation]}
                onValueChange={(value) => setSaturation(value[0])}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Grayscale: {grayscale}%
              </label>
              <Slider
                value={[grayscale]}
                onValueChange={(value) => setGrayscale(value[0])}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Sepia: {sepia}%
              </label>
              <Slider
                value={[sepia]}
                onValueChange={(value) => setSepia(value[0])}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Blur: {blur}px
              </label>
              <Slider
                value={[blur]}
                onValueChange={(value) => setBlur(value[0])}
                min={0}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  setGrayscale(0);
                  setSepia(0);
                  setBlur(0);
                  showToast('Filters reset to default values');
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
              <Button
                onClick={() => {
                  // Apply filters to the processedImage
                  if (processedImage && filterCanvasRef.current) {
                    setIsProcessing(true);
                    const img = new Image();
                    img.onload = () => {
                      const canvas = filterCanvasRef.current;
                      const ctx = canvas.getContext("2d");

                      // Ensure canvas matches image dimensions for filter application
                      canvas.width = img.width;
                      canvas.height = img.height;
                      
                      // Apply CSS filters to canvas
                      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`;
                      ctx.drawImage(img, 0, 0, img.width, img.height);
                      
                      // Reset the filter context to prevent it from affecting subsequent operations
                      ctx.filter = 'none';
                      
                      setProcessedImage(canvas.toDataURL("image/png"));
                      
                      // Reset filter values after applying
                      setBrightness(100);
                      setContrast(100);
                      setSaturation(100);
                      setGrayscale(0);
                      setSepia(0);
                      setBlur(0);
                      
                      setIsProcessing(false);
                      showToast('Filters applied successfully');
                    };
                    img.src = processedImage;
                  }
                }}
                className="w-full"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {tools.find(t => t.id === activeTool)?.description}
            </p>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Coming soon...
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            KAYABLUE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
            Professional Image Editing Tools
          </p>
        </div>

        <Card className="p-4 md:p-8 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
          {!image ? (
            <div className="flex flex-col items-center justify-center py-12 md:py-16">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-8 md:p-12 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Click to upload an image</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden min-h-[300px] md:min-h-[400px]">
                {activeTool === 'crop' ? (
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={undefined} minWidth={50} minHeight={50}>
                    <img
                      ref={imgRef}
                      alt="Crop me" 
                      src={processedImage} // Use processedImage for cropping
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[400px] md:max-h-[600px] object-contain"
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={processedImage}
                    alt="Uploaded preview" 
                    className="max-w-full max-h-[400px] md:max-h-[600px] object-contain"
                    style={{
                      filter: activeTool === 'filters' 
                        ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`
                        : 'none'
                    }}
                  />
                )}
                {activeTool === 'crop' && completedCrop && (
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: completedCrop.width,
                      height: completedCrop.height,
                      display: 'none' // Hidden canvas for processing
                    }}
                  />
                )}
                  <canvas
                    ref={filterCanvasRef}
                    style={{
                      display: 'none' // Hidden canvas for filter processing
                    }}
                  />
              </div>

              {/* Tool Selection - Only show if no tool is active */}
              {!activeTool && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                    Select a tool to edit your image:
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {tools.map((tool) => {
                      const Icon = tool.icon
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleToolChange(tool.id)}
                          className="flex flex-col items-center gap-2 p-4 md:p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        >
                          <Icon className="w-6 h-6 md:w-8 md:h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-sm md:text-base text-gray-700 dark:text-gray-300">
                            {tool.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 text-center hidden md:block">
                            {tool.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Active Tool Panel */}
              {activeTool && (
                <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6 bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {tools.find(t => t.id === activeTool)?.name}
                    </h2>
                    <Button 
                      onClick={() => {
                        setActiveTool(null)
                        // When going back to tools, keep the processed image as is
                        setRotation(0)
                        setCrop(undefined)
                        setCompletedCrop(null)
                      }} 
                      variant="outline" 
                      size="sm"
                      className="text-xs md:text-sm"
                    >
                      Back to Tools
                    </Button>
                  </div>
                  
                  {renderToolPanel()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={handleDownload} className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
                <Button onClick={handleReset} variant="secondary" className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Image
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-6 md:mt-8">
          All processing happens in your browser. Your images are never uploaded to any server.
        </p>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-lg animate-slide-up z-50">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Processing image...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

