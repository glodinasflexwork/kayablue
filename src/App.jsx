import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Upload, Download, RotateCw, RotateCcw, RefreshCw, Crop, Maximize, Palette, Image as ImageIcon, Compress } from 'lucide-react'

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
  const [aspect, setAspect] = useState(undefined)

  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  const [newWidth, setNewWidth] = useState(0)
  const [newHeight, setNewHeight] = useState(0)

  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [grayscale, setGrayscale] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [blur, setBlur] = useState(0)

  const [compressionQuality, setCompressionQuality] = useState(90) // 0-100
  const [outputFormat, setOutputFormat] = useState('image/png') // image/png, image/jpeg, image/webp

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setRotation(0)
        setCompletedCrop(null)
        setCrop(undefined)
        setBrightness(100)
        setContrast(100)
        setSaturation(100)
        setGrayscale(0)
        setSepia(0)
        setBlur(0)
        setCompressionQuality(90)
        setOutputFormat('image/png')

        const img = new Image()
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          setNewWidth(img.width)
          setNewHeight(img.height)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget
    const { naturalWidth, naturalHeight } = e.currentTarget
    setOriginalDimensions({ width: naturalWidth, height: naturalHeight })
    setNewWidth(naturalWidth)
    setNewHeight(naturalHeight)

    if (!crop) {
      setCrop(centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          aspect,
          naturalWidth,
          naturalHeight,
        ),
        naturalWidth,
        naturalHeight,
      ))
    }
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
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setGrayscale(0)
    setSepia(0)
    setBlur(0)
    setCompressionQuality(90)
    setOutputFormat('image/png')
    if (imgRef.current) {
      setNewWidth(imgRef.current.naturalWidth)
      setNewHeight(imgRef.current.naturalHeight)
    }
  }

  const applyFilters = (ctx) => {
    let filterString = ''
    if (brightness !== 100) filterString += `brightness(${brightness}%) `
    if (contrast !== 100) filterString += `contrast(${contrast}%) `
    if (saturation !== 100) filterString += `saturate(${saturation}%) `
    if (grayscale !== 0) filterString += `grayscale(${grayscale}%) `
    if (sepia !== 0) filterString += `sepia(${sepia}%) `
    if (blur !== 0) filterString += `blur(${blur}px) `
    ctx.filter = filterString.trim()
  }

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return
    }

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
      completedCrop.height * scaleY,
    )

    const croppedImage = canvas.toDataURL('image/png')
    setImage(croppedImage)
    setRotation(0)
    setCompletedCrop(null)
    setCrop(undefined)
    const newImg = new Image()
    newImg.onload = () => {
      setOriginalDimensions({ width: newImg.width, height: newImg.height })
      setNewWidth(newImg.width)
      setNewHeight(newImg.height)
    }
    newImg.src = croppedImage
  }

  const handleResize = () => {
    if (!image || !newWidth || !newHeight) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = newWidth
      canvas.height = newHeight
      applyFilters(ctx)
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      const resizedImage = canvas.toDataURL('image/png')
      setImage(resizedImage)
      setOriginalDimensions({ width: newWidth, height: newHeight })
    }
    img.src = image
  }

  const handleWidthChange = (e) => {
    const width = parseInt(e.target.value)
    if (!isNaN(width) && originalDimensions.width > 0) {
      setNewWidth(width)
      setNewHeight(Math.round(width / originalDimensions.width * originalDimensions.height))
    } else if (e.target.value === '') {
      setNewWidth('')
    }
  }

  const handleHeightChange = (e) => {
    const height = parseInt(e.target.value)
    if (!isNaN(height) && originalDimensions.height > 0) {
      setNewHeight(height)
      setNewWidth(Math.round(height / originalDimensions.height * originalDimensions.width))
    } else if (e.target.value === '') {
      setNewHeight('')
    }
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
      applyFilters(ctx)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      
      const fileName = `kayablue-image-${Date.now()}`
      let downloadFileName = fileName
      let mimeType = outputFormat

      if (outputFormat === 'image/jpeg') {
        downloadFileName += '.jpeg'
      } else if (outputFormat === 'image/webp') {
        downloadFileName += '.webp'
      } else {
        downloadFileName += '.png'
      }

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadFileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, mimeType, compressionQuality / 100)
    }
    
    img.src = image
  }

  useEffect(() => {
    if (!image || !imgRef.current || !previewCanvasRef.current) return

    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    // Temporarily set canvas to image dimensions for filter application
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    applyFilters(ctx)
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)

    // Update the displayed image with filters applied
    // Note: This re-renders the image with filters, but for download, filters are applied again on the final canvas
    setImage(canvas.toDataURL('image/png'))
  }, [brightness, contrast, saturation, grayscale, sepia, blur])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            KAYABLUE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Upload, Rotate, Crop, Resize, Filter & Convert Your Images
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
                      objectFit: 'contain',
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`
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

                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={newWidth === 0 ? '' : newWidth}
                      onChange={handleWidthChange}
                      className="w-full"
                    />
                    <span className="text-gray-700 dark:text-gray-300">x</span>
                    <Input
                      type="number"
                      placeholder="Height"
                      value={newHeight === 0 ? '' : newHeight}
                      onChange={handleHeightChange}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleResize}
                    variant="outline"
                    className="flex-1 min-w-[140px]"
                    disabled={!newWidth || !newHeight || (newWidth === originalDimensions.width && newHeight === originalDimensions.height)}
                  >
                    <Maximize className="w-4 h-4 mr-2" />
                    Apply Resize
                  </Button>
                </div>

                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Palette className="w-5 h-5" /> Image Filters
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brightness: {brightness}%</label>
                      <Slider
                        value={[brightness]}
                        onValueChange={(value) => setBrightness(value[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contrast: {contrast}%</label>
                      <Slider
                        value={[contrast]}
                        onValueChange={(value) => setContrast(value[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Saturation: {saturation}%</label>
                      <Slider
                        value={[saturation]}
                        onValueChange={(value) => setSaturation(value[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grayscale: {grayscale}%</label>
                      <Slider
                        value={[grayscale]}
                        onValueChange={(value) => setGrayscale(value[0])}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sepia: {sepia}%</label>
                      <Slider
                        value={[sepia]}
                        onValueChange={(value) => setSepia(value[0])}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Blur: {blur}px</label>
                      <Slider
                        value={[blur]}
                        onValueChange={(value) => setBlur(value[0])}
                        min={0}
                        max={10}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Compress className="w-5 h-5" /> Compression & Format
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quality: {compressionQuality}%</label>
                      <Slider
                        value={[compressionQuality]}
                        onValueChange={(value) => setCompressionQuality(value[0])}
                        min={10}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Output Format</label>
                      <Select value={outputFormat} onValueChange={setOutputFormat}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image/png">PNG</SelectItem>
                          <SelectItem value="image/jpeg">JPEG</SelectItem>
                          <SelectItem value="image/webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setImage(null)
                      setRotation(0)
                      setCompletedCrop(null)
                      setCrop(undefined)
                      setOriginalDimensions({ width: 0, height: 0 })
                      setNewWidth(0)
                      setNewHeight(0)
                      setBrightness(100)
                      setContrast(100)
                      setSaturation(100)
                      setGrayscale(0)
                      setSepia(0)
                      setBlur(0)
                      setCompressionQuality(90)
                      setOutputFormat('image/png')
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

