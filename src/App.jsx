
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Upload, Download, RotateCw, Crop, Maximize, Palette, Archive, FileImage, RotateCcw } from 'lucide-react'
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
  const imgRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

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

  const rotateImage = (degrees) => {
    if (!image) return

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
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      setProcessedImage(canvas.toDataURL('image/png'))
    }
    img.src = image
  }

  useEffect(() => {
    if (activeTool === 'rotate' && image) {
      rotateImage(rotation)
    }
  }, [rotation, activeTool])

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
    setProcessedImage(image) // Reset to original image when changing tool
    setRotation(0) // Reset rotation
    setCrop(undefined) // Reset crop
    setCompletedCrop(null)
  }

  // Cropping functions
  function onImageLoad(e) {
    imgRef.current = e.currentTarget
    const { width, height } = e.currentTarget
    // Set initial crop to cover most of the image without a fixed aspect ratio
    // This will create a crop area that is 80% of the image width and height, centered.
    // Users can then freely adjust it.
    const newCrop = centerCrop(
      {
        unit: '%',
        width: 80,
        height: 80,
      },
      width,
      height
    )
    setCrop(newCrop)
  }

  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      const image = imgRef.current
      const canvas = previewCanvasRef.current
      const ctx = canvas.getContext('2d')

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const pixelRatio = window.devicePixelRatio

      canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
      canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

      ctx.scale(pixelRatio, pixelRatio)
      ctx.imageSmoothingQuality = 'high'

      const cropX = completedCrop.x * scaleX
      const cropY = completedCrop.y * scaleY

      ctx.drawImage(
        image,
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
    }
  }, [completedCrop])

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
                onValueChange={(value) => setRotation(value[0])}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                variant="outline"
                className="w-full"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                90° Right
              </Button>
              <Button
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                90° Left
              </Button>
              <Button
                onClick={() => setRotation(180)}
                variant="outline"
                className="w-full"
              >
                180°
              </Button>
              <Button
                onClick={() => setRotation(0)}
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
            <Button onClick={() => setCompletedCrop(crop)} className="w-full">
              Apply Crop
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
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={undefined}>
                    <img
                      ref={imgRef}
                      alt="Crop me" 
                      src={image}
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[400px] md:max-h-[600px] object-contain"
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={processedImage || image}
                    alt="Uploaded preview" 
                    className="max-w-full max-h-[400px] md:max-h-[600px] object-contain"
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
                        setProcessedImage(image)
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
    </div>
  )
}

export default App

