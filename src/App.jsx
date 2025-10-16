import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Upload, Download, RotateCw, RotateCcw, RefreshCw, Crop } from 'lucide-react'

import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [rotation, setRotation] = useState(0)
  const fileInputRef = useRef(null)
  const imgRef = useRef(null)
  const previewCanvasRef = useRef(null)

  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [aspect, setAspect] = useState(16 / 9)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setRotation(0)
        setCompletedCrop(null)
        setCrop(undefined) // Clear crop when new image is uploaded
      }
      reader.readAsDataURL(file)
    }
  }

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget
    const { width, height } = e.currentTarget
    setCrop(centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        aspect,
        width,
        height,
      ),
      width,
      height,
    ))
  }

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90)
  }

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90)
  }

  const handleReset = () => {
    setRotation(0)
    setCompletedCrop(null)
    setCrop(undefined)
  }

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return
    }

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
      completedCrop.height * scaleY,
    )

    // Convert the cropped canvas to a data URL and set it as the new image
    const croppedImage = canvas.toDataURL('image/png')
    setImage(croppedImage)
    setRotation(0) // Reset rotation after cropping
    setCompletedCrop(null) // Clear completed crop
    setCrop(undefined) // Clear crop selection
  }

  const handleDownload = () => {
    if (!image) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const rad = (rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(rad))
      const cos = Math.abs(Math.cos(rad))
      
      canvas.width = img.width * cos + img.height * sin
      canvas.height = img.width * sin + img.height * cos
      
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(rad)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kayablue-image-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    
    img.src = image
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            KAYABLUE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Upload, Rotate & Crop Your Images
          </p>
        </div>

        <Card className="p-8 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
          {!image ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-12 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Click to upload an image
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                >
                  <img
                    ref={imgRef}
                    src={image}
                    alt="Uploaded"
                    onLoad={onImageLoad}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease-in-out',
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain'
                    }}
                    className="shadow-lg"
                  />
                </ReactCrop>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">
                    Rotation: {rotation}°
                  </span>
                  <Slider
                    value={[rotation]}
                    onValueChange={(value) => setRotation(value[0])}
                    min={-180}
                    max={180}
                    step={1}
                    className="flex-1"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleRotateLeft}
                    variant="outline"
                    className="flex-1 min-w-[140px]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rotate Left 90°
                  </Button>
                  <Button
                    onClick={handleRotateRight}
                    variant="outline"
                    className="flex-1 min-w-[140px]"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotate Right 90°
                  </Button>
                  <Button
                    onClick={handleCrop}
                    variant="outline"
                    className="flex-1 min-w-[140px]"
                    disabled={!completedCrop?.width || !completedCrop?.height}
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Apply Crop
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 min-w-[140px]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setImage(null)
                      setRotation(0)
                      setCompletedCrop(null)
                      setCrop(undefined)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Image
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>All processing happens in your browser. Your images are never uploaded to any server.</p>
        </div>
      </div>
      <canvas
        ref={previewCanvasRef}
        style={{
          display: 'none',
        }}
      />
    </div>
  )
}

export default App

