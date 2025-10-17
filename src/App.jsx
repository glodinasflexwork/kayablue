
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Upload, Download, RotateCw, Crop, Maximize, Palette, Archive, FileImage, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import ReactCrop, { centerCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { applyFiltersToCanvas } from './filterUtils'

import './App.css'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

function App() {
  const [mode, setMode] = useState('image') // 'image' or 'pdf'
  const [image, setImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [activeTool, setActiveTool] = useState(null)
  const [pdfFiles, setPdfFiles] = useState([])
  const [pdfDocument, setPdfDocument] = useState(null)
  const [pdfPageThumbnails, setPdfPageThumbnails] = useState([])
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false)
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
  const [compressionQuality, setCompressionQuality] = useState(80)
  const [compressionFormat, setCompressionFormat] = useState('jpeg')
  const [originalFileSize, setOriginalFileSize] = useState(0)
  const [compressedFileSize, setCompressedFileSize] = useState(0)
  const [convertFormat, setConvertFormat] = useState('png')
  const [convertQuality, setConvertQuality] = useState(90)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [isProcessing, setIsProcessing] = useState(false)
  const imgRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const filterCanvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const pdfFileInputRef = useRef(null)

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

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0 && files.every(file => file.type === 'application/pdf')) {
      setPdfFiles(files)
      setActiveTool(null)
      setSelectedPages(new Set())
      setPdfPageThumbnails([])
      showToast(`${files.length} PDF file(s) uploaded successfully`)
      
      // Auto-generate thumbnails with timeout fallback
      if (files.length > 0) {
        setTimeout(async () => {
          try {
            await generatePdfThumbnails(files[0])
          } catch (error) {
            console.log('Auto thumbnail generation failed, user can load manually')
          }
        }, 500) // Small delay to let UI update first
      }
    } else {
      showToast('Error: Please upload only PDF files')
    }
  }

  const generatePdfThumbnails = async (file) => {
    setIsLoadingThumbnails(true)
    try {
      // Configure PDF.js worker to use local file
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      const thumbnails = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.5 })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
        
        thumbnails.push({
          dataUrl: canvas.toDataURL(),
          rotation: page.rotate || 0
        })
      }
      
      setPdfPageThumbnails(thumbnails)
      setIsLoadingThumbnails(false)
    } catch (error) {
      console.error('Error generating PDF thumbnails:', error)
      setIsLoadingThumbnails(false)
      showToast('Error: Failed to generate PDF previews')
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

    // If filter tool is active, apply filters using pixel manipulation
    if (activeTool === 'filters' && (brightness !== 100 || contrast !== 100 || saturation !== 100 || grayscale !== 0 || sepia !== 0 || blur !== 0)) {
      const tempImg = new Image()
      tempImg.onload = () => {
        const canvas = document.createElement('canvas')
        
        // Apply filters using pixel-based manipulation
        applyFiltersToCanvas(canvas, tempImg, {
          brightness,
          contrast,
          saturation,
          grayscale,
          sepia,
          blur
        })
        
        // Download the filtered image
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `kayablue-filters-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      tempImg.src = processedImage
    } else {
      // For other tools or no filters, download processedImage directly
      // Detect the actual format from the data URL
      let extension = 'png'
      if (processedImage.startsWith('data:image/jpeg')) {
        extension = 'jpg'
      } else if (processedImage.startsWith('data:image/webp')) {
        extension = 'webp'
      }
      
      const a = document.createElement('a')
      a.href = processedImage
      a.download = `kayablue-${activeTool || 'image'}-${Date.now()}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
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
    setCompressionQuality(80)
    setCompressionFormat('jpeg')
    setConvertFormat('png')
    setConvertQuality(90)
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
        const applyPreset = (preset) => {
          switch (preset) {
            case 'none':
              setBrightness(100);
              setContrast(100);
              setSaturation(100);
              setGrayscale(0);
              setSepia(0);
              setBlur(0);
              break;
            case 'bw':
              setBrightness(100);
              setContrast(110);
              setSaturation(0);
              setGrayscale(100);
              setSepia(0);
              setBlur(0);
              break;
            case 'vintage':
              setBrightness(110);
              setContrast(90);
              setSaturation(80);
              setGrayscale(0);
              setSepia(40);
              setBlur(0);
              break;
            case 'vivid':
              setBrightness(105);
              setContrast(120);
              setSaturation(150);
              setGrayscale(0);
              setSepia(0);
              setBlur(0);
              break;
            case 'cool':
              setBrightness(100);
              setContrast(105);
              setSaturation(120);
              setGrayscale(0);
              setSepia(0);
              setBlur(0);
              break;
            case 'warm':
              setBrightness(110);
              setContrast(100);
              setSaturation(110);
              setGrayscale(0);
              setSepia(25);
              setBlur(0);
              break;
            case 'dramatic':
              setBrightness(90);
              setContrast(140);
              setSaturation(90);
              setGrayscale(0);
              setSepia(0);
              setBlur(0);
              break;
            default:
              break;
          }
        };

        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Filter Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('none')}
                  className="text-xs"
                >
                  None
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('bw')}
                  className="text-xs"
                >
                  Black & White
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('vintage')}
                  className="text-xs"
                >
                  Vintage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('vivid')}
                  className="text-xs"
                >
                  Vivid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('cool')}
                  className="text-xs"
                >
                  Cool
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('warm')}
                  className="text-xs"
                >
                  Warm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('dramatic')}
                  className="text-xs"
                >
                  Dramatic
                </Button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brightness
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBrightness(Math.max(0, brightness - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={brightness}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setBrightness(Math.min(200, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={200}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBrightness(Math.min(200, brightness + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contrast
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContrast(Math.max(0, contrast - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={contrast}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setContrast(Math.min(200, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={200}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContrast(Math.min(200, contrast + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Saturation
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaturation(Math.max(0, saturation - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={saturation}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSaturation(Math.min(200, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={200}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaturation(Math.min(200, saturation + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Grayscale
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGrayscale(Math.max(0, grayscale - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={grayscale}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setGrayscale(Math.min(100, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGrayscale(Math.min(100, grayscale + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sepia
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSepia(Math.max(0, sepia - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={sepia}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSepia(Math.min(100, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSepia(Math.min(100, sepia + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blur
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlur(Math.max(0, blur - 1))}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={blur}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setBlur(Math.min(20, Math.max(0, val)));
                    }}
                    className="w-16 h-7 px-2 text-center border rounded text-sm"
                    min={0}
                    max={20}
                  />
                  <span className="text-sm text-gray-500">px</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlur(Math.min(20, blur + 1))}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
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
                  if (!processedImage) {
                    showToast('Error: No image to apply filters to');
                    return;
                  }
                  
                  if (!filterCanvasRef.current) {
                    showToast('Error: Canvas not initialized');
                    return;
                  }
                  
                  setIsProcessing(true);
                  
                  const tempImg = new Image();
                  tempImg.onload = () => {
                    try {
                      const canvas = filterCanvasRef.current;
                      if (!canvas) {
                        setIsProcessing(false);
                        showToast("Error: Canvas lost during processing");
                        return;
                      }
                      
                      const ctx = canvas.getContext("2d");

                      // Set canvas dimensions to match the loaded image's natural dimensions
                      canvas.width = tempImg.naturalWidth;
                      canvas.height = tempImg.naturalHeight;
                      
                      // Draw the image first without filters
                      ctx.drawImage(tempImg, 0, 0, tempImg.naturalWidth, tempImg.naturalHeight);
                      
                      // Get image data for manual pixel manipulation
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const data = imageData.data;
                      
                      // Construct CSS filter string for non-blur filters
                      let filterString = ``;
                      if (brightness !== 100) filterString += `brightness(${brightness}%) `;
                      if (contrast !== 100) filterString += `contrast(${contrast}%) `;
                      if (saturation !== 100) filterString += `saturate(${saturation}%) `;
                      if (grayscale !== 0) filterString += `grayscale(${grayscale}%) `;
                      if (sepia !== 0) filterString += `sepia(${sepia}%) `;

                      // Apply non-blur filters to the context
                      ctx.filter = filterString.trim();

                      // Draw the image with non-blur filters applied
                      ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);

                      // Handle blur separately if needed
                      if (blur > 0) {
                        const tempCanvas = document.createElement("canvas");
                        tempCanvas.width = canvas.width;
                        tempCanvas.height = canvas.height;
                        const tempCtx = tempCanvas.getContext("2d");
                        
                        // Draw the current (non-blurred filtered) image onto the temp canvas
                        tempCtx.drawImage(canvas, 0, 0);
                        
                        // Apply blur filter to the temp canvas context
                        tempCtx.filter = `blur(${blur}px)`;
                        
                        // Draw the blurred image back onto the main canvas
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.filter = 'none'; // Reset filter on main canvas before drawing blurred image
                        ctx.drawImage(tempCanvas, 0, 0);
                      }

                      console.log("Filters applied to canvas.");
                                           // Reset filter context after all operations
                      ctx.filter = 'none';
                      
                      const finalProcessedImage = canvas.toDataURL("image/png");
                      console.log("Final processed image data URL generated. Length:", finalProcessedImage.length);
                      setProcessedImage(finalProcessedImage);
                      
                      // DO NOT reset filter values - keep them visible so users know what was applied
                      // and so the download function can capture them if needed
                      
                      setIsProcessing(false);
                      showToast('Filters applied successfully');
                    } catch (error) {
                      setIsProcessing(false);
                      showToast('Error: Failed to apply filters');
                      console.error('Filter application error:', error);
                    }
                  };
                  tempImg.onerror = () => {
                    setIsProcessing(false);
                    showToast('Error: Failed to load image from processedImage source');
                  };
                  // Ensure tempImg.src is set after onload to guarantee event fires
                  tempImg.src = processedImage;
                }}
                className="w-full"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )

      case 'compress':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Compression Quality: {compressionQuality}%
              </label>
              <Slider
                value={[compressionQuality]}
                onValueChange={(value) => setCompressionQuality(value[0])}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Higher quality = larger file size
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setCompressionFormat('jpeg')}
                  variant={compressionFormat === 'jpeg' ? 'default' : 'outline'}
                  className="w-full"
                >
                  JPEG
                </Button>
                <Button
                  onClick={() => setCompressionFormat('png')}
                  variant={compressionFormat === 'png' ? 'default' : 'outline'}
                  className="w-full"
                >
                  PNG
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                JPEG: Best for photos | PNG: Best for graphics with transparency
              </p>
            </div>

            {compressedFileSize > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Original:</span> {(originalFileSize / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Compressed:</span> {(compressedFileSize / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                  Reduction: {((1 - compressedFileSize / originalFileSize) * 100).toFixed(1)}%
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                if (!processedImage) {
                  showToast('Error: No image to compress');
                  return;
                }

                setIsProcessing(true);

                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;

                  ctx.drawImage(img, 0, 0);

                  // Get original file size
                  const originalSize = Math.round((processedImage.length - 'data:image/png;base64,'.length) * 3 / 4);
                  setOriginalFileSize(originalSize);

                  // Compress based on format and quality
                  const mimeType = compressionFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
                  const quality = compressionFormat === 'jpeg' ? compressionQuality / 100 : 1;
                  const compressedDataUrl = canvas.toDataURL(mimeType, quality);

                  // Get compressed file size
                  const compressedSize = Math.round((compressedDataUrl.length - `data:${mimeType};base64,`.length) * 3 / 4);
                  setCompressedFileSize(compressedSize);

                  setProcessedImage(compressedDataUrl);
                  setIsProcessing(false);
                  showToast('Image compressed successfully');
                };
                img.onerror = () => {
                  setIsProcessing(false);
                  showToast('Error: Failed to load image');
                };
                img.src = processedImage;
              }}
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? 'Compressing...' : 'Apply Compression'}
            </Button>
          </div>
        )

      case 'format':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Convert To Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => setConvertFormat('png')}
                  variant={convertFormat === 'png' ? 'default' : 'outline'}
                  className="w-full"
                >
                  PNG
                </Button>
                <Button
                  onClick={() => setConvertFormat('jpeg')}
                  variant={convertFormat === 'jpeg' ? 'default' : 'outline'}
                  className="w-full"
                >
                  JPEG
                </Button>
                <Button
                  onClick={() => setConvertFormat('webp')}
                  variant={convertFormat === 'webp' ? 'default' : 'outline'}
                  className="w-full"
                >
                  WebP
                </Button>
              </div>
            </div>

            {(convertFormat === 'jpeg' || convertFormat === 'webp') && (
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Quality: {convertQuality}%
                </label>
                <Slider
                  value={[convertQuality]}
                  onValueChange={(value) => setConvertQuality(value[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Higher quality = larger file size
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-medium">Format Info:</span>
              </p>
              {convertFormat === 'png' && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  PNG: Lossless compression, supports transparency. Best for graphics, logos, and images requiring transparency.
                </p>
              )}
              {convertFormat === 'jpeg' && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  JPEG: Lossy compression, no transparency. Best for photographs and images with many colors. Smaller file sizes.
                </p>
              )}
              {convertFormat === 'webp' && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  WebP: Modern format with superior compression. Supports both lossy and lossless compression, and transparency. Best overall quality-to-size ratio.
                </p>
              )}
            </div>

            <Button
              onClick={() => {
                if (!processedImage) {
                  showToast('Error: No image to convert');
                  return;
                }

                setIsProcessing(true);

                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;

                  ctx.drawImage(img, 0, 0);

                  // Convert to selected format
                  let mimeType = 'image/png';
                  let quality = 1;

                  if (convertFormat === 'jpeg') {
                    mimeType = 'image/jpeg';
                    quality = convertQuality / 100;
                  } else if (convertFormat === 'webp') {
                    mimeType = 'image/webp';
                    quality = convertQuality / 100;
                  }

                  const convertedDataUrl = canvas.toDataURL(mimeType, quality);
                  setProcessedImage(convertedDataUrl);
                  setIsProcessing(false);
                  showToast(`Image converted to ${convertFormat.toUpperCase()} successfully`);
                };
                img.onerror = () => {
                  setIsProcessing(false);
                  showToast('Error: Failed to load image');
                };
                img.src = processedImage;
              }}
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? 'Converting...' : `Convert to ${convertFormat.toUpperCase()}`}
            </Button>
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
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-4">
            Professional Image & Document Editing Tools
          </p>
          
          {/* Mode Selector */}
          <div className="flex justify-center gap-3 mb-4">
            <Button
              onClick={() => {
                setMode('image');
                setImage(null);
                setProcessedImage(null);
                setActiveTool(null);
                setPdfFiles([]);
                setPdfDocument(null);
              }}
              variant={mode === 'image' ? 'default' : 'outline'}
              className="min-w-[120px]"
            >
              📷 Image Editor
            </Button>
            <Button
              onClick={() => {
                setMode('pdf');
                setImage(null);
                setProcessedImage(null);
                setActiveTool(null);
                setPdfFiles([]);
                setPdfDocument(null);
              }}
              variant={mode === 'pdf' ? 'default' : 'outline'}
              className="min-w-[120px]"
            >
              📄 PDF Editor
            </Button>
          </div>
        </div>

        <Card className="p-4 md:p-8 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
          {mode === 'image' ? (
            // IMAGE EDITOR MODE
            !image ? (
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
          )
          ) : (
            // PDF EDITOR MODE
            pdfFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-16">
                <div 
                  onClick={() => pdfFileInputRef.current?.click()}
                  className="w-full max-w-md border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-8 md:p-12 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Click to upload PDF file(s)</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">PDF files up to 50MB each</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">You can upload multiple PDFs for merging</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  ref={pdfFileInputRef} 
                  onChange={handlePdfUpload} 
                  className="hidden" 
                  multiple
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* PDF Files List */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Uploaded PDFs ({pdfFiles.length}) - Drag to reorder</h3>
                  <div className="space-y-2">
                    {pdfFiles.map((file, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', index)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
                          const dropIndex = index
                          if (dragIndex !== dropIndex) {
                            const newFiles = [...pdfFiles]
                            const [removed] = newFiles.splice(dragIndex, 1)
                            newFiles.splice(dropIndex, 0, removed)
                            setPdfFiles(newFiles)
                          }
                        }}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg cursor-move hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 dark:text-gray-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                            </svg>
                          </div>
                          <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            const newFiles = pdfFiles.filter((_, i) => i !== index)
                            setPdfFiles(newFiles)
                            if (newFiles.length === 0) setActiveTool(null)
                          }}
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF Tools */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select a tool:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      onClick={() => setActiveTool('pdf-merge')}
                      variant={activeTool === 'pdf-merge' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      disabled={pdfFiles.length < 2}
                    >
                      <span className="text-2xl">🔗</span>
                      <span className="text-sm">Merge</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTool('pdf-split')}
                      variant={activeTool === 'pdf-split' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">✂️</span>
                      <span className="text-sm">Split</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTool('pdf-rotate')}
                      variant={activeTool === 'pdf-rotate' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">🔄</span>
                      <span className="text-sm">Rotate</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTool('pdf-compress')}
                      variant={activeTool === 'pdf-compress' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">🗜️</span>
                      <span className="text-sm">Compress</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTool('pdf-to-images')}
                      variant={activeTool === 'pdf-to-images' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">🖼️</span>
                      <span className="text-sm">To Images</span>
                    </Button>
                    <Button
                      onClick={() => setActiveTool('images-to-pdf')}
                      variant={activeTool === 'images-to-pdf' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">📑</span>
                      <span className="text-sm">To PDF</span>
                    </Button>
                  </div>
                </div>

                {/* Tool Panel */}
                {activeTool === 'pdf-merge' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      🔗 Merge PDFs
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Combine {pdfFiles.length} PDF files into a single document. The files will be merged in the order shown above.
                    </p>
                    <Button
                      onClick={async () => {
                        if (pdfFiles.length < 2) {
                          showToast('Error: Please upload at least 2 PDF files to merge');
                          return;
                        }

                        setIsProcessing(true);

                        try {
                          // Create a new PDF document
                          const mergedPdf = await PDFDocument.create();

                          // Process each PDF file
                          for (const file of pdfFiles) {
                            const arrayBuffer = await file.arrayBuffer();
                            const pdf = await PDFDocument.load(arrayBuffer);
                            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                            copiedPages.forEach((page) => mergedPdf.addPage(page));
                          }

                          // Save the merged PDF
                          const mergedPdfBytes = await mergedPdf.save();
                          const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);

                          // Download the merged PDF
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `kayablue-merged-${Date.now()}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);

                          setIsProcessing(false);
                          showToast('PDFs merged successfully!');
                        } catch (error) {
                          console.error('Error merging PDFs:', error);
                          setIsProcessing(false);
                          showToast('Error: Failed to merge PDFs');
                        }
                      }}
                      className="w-full"
                      disabled={isProcessing || pdfFiles.length < 2}
                    >
                      {isProcessing ? 'Merging PDFs...' : `Merge ${pdfFiles.length} PDFs`}
                    </Button>
                  </div>
                )}

                {activeTool === 'pdf-split' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      ✂️ Split PDF - Extract Pages
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Click on pages to select them for extraction.
                    </p>
                    
                    {/* Manual Load Button (backup if auto-load fails) */}
                    {pdfFiles.length > 0 && pdfPageThumbnails.length === 0 && !isLoadingThumbnails && (
                      <Button
                        onClick={() => generatePdfThumbnails(pdfFiles[0])}
                        variant="outline"
                        className="w-full mb-4"
                      >
                        Load Page Previews
                      </Button>
                    )}
                    
                    {/* Loading State */}
                    {isLoadingThumbnails && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        Loading page previews...
                      </div>
                    )}
                    
                    {/* Page Thumbnails Grid */}
                    {pdfPageThumbnails.length > 0 && (
                      <div>
                        <div className="flex gap-2 mb-4">
                          <Button
                            onClick={() => {
                              const allPages = new Set(Array.from({ length: pdfPageThumbnails.length }, (_, i) => i));
                              setSelectedPages(allPages);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Select All
                          </Button>
                          <Button
                            onClick={() => setSelectedPages(new Set())}
                            variant="outline"
                            size="sm"
                            disabled={selectedPages.size === 0}
                          >
                            Clear Selection
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 max-h-96 overflow-y-auto">
                          {pdfPageThumbnails.map((thumbnail, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                const newSelected = new Set(selectedPages);
                                if (newSelected.has(index)) {
                                  newSelected.delete(index);
                                } else {
                                  newSelected.add(index);
                                }
                                setSelectedPages(newSelected);
                              }}
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedPages.has(index)
                                  ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                              }`}
                            >
                              <div className="relative bg-white">
                                <img
                                  src={thumbnail.dataUrl}
                                  alt={`Page ${index + 1}`}
                                  className="w-full h-auto"
                                />
                                {selectedPages.has(index) && (
                                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 text-center">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Page {index + 1}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={async () => {
                          if (pdfFiles.length === 0) {
                            showToast('Error: Please upload a PDF file first');
                            return;
                          }
                          
                          if (selectedPages.size === 0) {
                            showToast('Error: Please select at least one page to extract');
                            return;
                          }

                          setIsProcessing(true);
                          try {
                            const pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
                            
                            // Load the first PDF
                            const arrayBuffer = await pdfFiles[0].arrayBuffer();
                            const pdfDoc = await PDFDocument.load(arrayBuffer);
                            
                            // Validate page numbers
                            const totalPages = pdfDoc.getPageCount();
                            const invalidPages = pagesToExtract.filter(p => p < 0 || p >= totalPages);
                            if (invalidPages.length > 0) {
                              showToast(`Error: Invalid page numbers. PDF has ${totalPages} pages.`);
                              setIsProcessing(false);
                              return;
                            }

                            // Create new PDF with selected pages
                            const newPdf = await PDFDocument.create();
                            const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
                            copiedPages.forEach(page => newPdf.addPage(page));

                            // Save and download
                            const pdfBytes = await newPdf.save();
                            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `kayablue-split-${Date.now()}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);

                            setIsProcessing(false);
                            showToast(`Successfully extracted ${pagesToExtract.length} pages!`);
                          } catch (error) {
                            console.error('Error splitting PDF:', error);
                            setIsProcessing(false);
                            showToast('Error: Failed to split PDF. Check page range format.');
                          }
                        }}
                        className="w-full"
                        disabled={isProcessing || pdfFiles.length === 0 || selectedPages.size === 0}
                      >
                        {isProcessing ? 'Extracting Pages...' : ('Extract ' + selectedPages.size + ' Selected Page' + (selectedPages.size !== 1 ? 's' : ''))}
                      </Button>
                  </div>
                )}

                {activeTool === 'pdf-rotate' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      🔄 Rotate Pages
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Click on pages to select them, then choose rotation angle.
                    </p>
                    
                    {/* Load Thumbnails Button */}
                    {pdfFiles.length > 0 && pdfPageThumbnails.length === 0 && !isLoadingThumbnails && (
                      <Button
                        onClick={() => generatePdfThumbnails(pdfFiles[0])}
                        variant="outline"
                        className="w-full mb-4"
                      >
                        Load Page Previews
                      </Button>
                    )}
                    
                    {/* Loading State */}
                    {isLoadingThumbnails && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        Loading page previews...
                      </div>
                    )}
                    
                    {/* Page Thumbnails Grid */}
                    {pdfPageThumbnails.length > 0 && (
                      <div>
                        <div className="flex gap-2 mb-4">
                          <Button
                            onClick={() => {
                              const allPages = new Set(Array.from({ length: pdfPageThumbnails.length }, (_, i) => i));
                              setSelectedPages(allPages);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Select All
                          </Button>
                          <Button
                            onClick={() => setSelectedPages(new Set())}
                            variant="outline"
                            size="sm"
                            disabled={selectedPages.size === 0}
                          >
                            Clear Selection
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 max-h-96 overflow-y-auto">
                          {pdfPageThumbnails.map((thumbnail, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                const newSelected = new Set(selectedPages);
                                if (newSelected.has(index)) {
                                  newSelected.delete(index);
                                } else {
                                  newSelected.add(index);
                                }
                                setSelectedPages(newSelected);
                              }}
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedPages.has(index)
                                  ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                              }`}
                            >
                              <div className="relative bg-white">
                                <img
                                  src={thumbnail.dataUrl}
                                  alt={`Page ${index + 1}`}
                                  className="w-full h-auto"
                                />
                                {selectedPages.has(index) && (
                                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 text-center">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Page {index + 1}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          {selectedPages.size === 0 ? 'All pages will be rotated' : `${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''} selected`}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-4">

                      {/* Rotation Angle Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rotation Angle
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => setRotation(90)}
                            variant={rotation === 90 ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                          >
                            90° ↻
                          </Button>
                          <Button
                            onClick={() => setRotation(180)}
                            variant={rotation === 180 ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                          >
                            180° ↻
                          </Button>
                          <Button
                            onClick={() => setRotation(270)}
                            variant={rotation === 270 ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                          >
                            270° ↻
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        if (pdfFiles.length === 0) {
                          showToast('Error: Please upload a PDF file first');
                          return;
                        }
                        
                        if (rotation === 0) {
                          showToast('Error: Please select a rotation angle');
                          return;
                        }

                        setIsProcessing(true);
                        try {
                          const arrayBuffer = await pdfFiles[0].arrayBuffer();
                          const pdfDoc = await PDFDocument.load(arrayBuffer);
                          const totalPages = pdfDoc.getPageCount();
                          
                          // Determine which pages to rotate
                          let pagesToRotate = [];
                          if (selectedPages.size === 0) {
                            // Rotate all pages
                            pagesToRotate = Array.from({ length: totalPages }, (_, i) => i);
                          } else {
                            // Rotate selected pages
                            pagesToRotate = Array.from(selectedPages).filter(p => p >= 0 && p < totalPages);
                          }

                          // Rotate the pages
                          const pages = pdfDoc.getPages();
                          pagesToRotate.forEach(pageIndex => {
                            const page = pages[pageIndex];
                            const currentRotation = page.getRotation().angle;
                            page.setRotation({ type: 'degrees', angle: (currentRotation + rotation) % 360 });
                          });

                          // Save and download
                          const pdfBytes = await pdfDoc.save();
                          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `kayablue-rotated-${Date.now()}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);

                          setIsProcessing(false);
                          showToast(`Successfully rotated ${pagesToRotate.length} page${pagesToRotate.length !== 1 ? 's' : ''} by ${rotation}°!`);
                        } catch (error) {
                          console.error('Error rotating PDF:', error);
                          setIsProcessing(false);
                          showToast('Error: Failed to rotate PDF pages');
                        }
                      }}
                      className="w-full mt-4"
                      disabled={isProcessing || pdfFiles.length === 0 || rotation === 0}
                    >
                      {isProcessing ? 'Rotating Pages...' : `Rotate ${selectedPages.size === 0 ? 'All' : selectedPages.size} Page${selectedPages.size !== 1 && selectedPages.size !== 0 ? 's' : ''} by ${rotation}°`}
                    </Button>
                  </div>
                )}

                {activeTool && !['pdf-merge', 'pdf-split', 'pdf-rotate'].includes(activeTool) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {activeTool === 'pdf-compress' && '🗜️ Compress PDF'}
                      {activeTool === 'pdf-to-images' && '🖼️ Convert to Images'}
                      {activeTool === 'images-to-pdf' && '📑 Convert to PDF'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This feature is coming soon!
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    onClick={() => pdfFileInputRef.current?.click()}
                    variant="secondary" 
                    className="w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload More PDFs
                  </Button>
                  <Button 
                    onClick={() => {
                      setPdfFiles([])
                      setPdfDocument(null)
                      setActiveTool(null)
                    }}
                    variant="secondary" 
                    className="w-full sm:w-auto"
                  >
                    Clear All
                  </Button>
                </div>
                
                <input 
                  type="file" 
                  accept="application/pdf" 
                  ref={pdfFileInputRef} 
                  onChange={handlePdfUpload} 
                  className="hidden" 
                  multiple
                />
              </div>
            )
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

