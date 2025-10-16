
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

  // Filter states
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [grayscale, setGrayscale] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [blur, setBlur] = useState(0)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
        setRotation(0)
        setCompletedCrop(null)
        setCrop(undefined)
        // Reset filters
        setBrightness(100)
        setContrast(100)
        setSaturation(100)
        setGrayscale(0)
        setSepia(0)
        setBlur(0)

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
    if (imgRef.current) {
      setNewWidth(imgRef.current.naturalWidth)
      setNewHeight(imgRef.current.naturalHeight)
    }
  }

  // Function to apply filters to a canvas context
  const applyFiltersToContext = (ctx) => {
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

    // Apply filters before drawing the cropped image
    applyFiltersToContext(ctx)

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
      // Apply filters before drawing the resized image
      applyFiltersToContext(ctx)
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
      // Apply filters before drawing for download
      applyFiltersToContext(ctx)
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

  // Filter string for direct application to the img element style
  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            KAYABLUE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Upload, Rotate, Crop, Resize & Filter Your Images
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center justify-center">
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center relative">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                  >
                    <img
                      ref={imgRef}
                      src={image}
                      alt="Uploaded preview" 
                      onLoad={onImageLoad}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        filter: filterStyle // Apply filters directly to img style
                      }}
                      className="max-w-full max-h-full object-contain"
                    />
                  </ReactCrop>
                </div>
                <canvas ref={previewCanvasRef} className="hidden" />
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Rotate</h3>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleRotateLeft} variant="outline" size="icon"><RotateCcw className="w-4 h-4" /></Button>
                    <Slider 
                      value={[rotation]} 
                      onValueChange={(value) => setRotation(value[0])} 
                      max={360} 
                      step={1} 
                    />
                    <Button onClick={handleRotateRight} variant="outline" size="icon"><RotateCw className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Crop</h3>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleCrop} className="w-full">Apply Crop</Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Resize</h3>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={newWidth} onChange={handleWidthChange} placeholder="Width" />
                    <Input type="number" value={newHeight} onChange={handleHeightChange} placeholder="Height" />
                    <Button onClick={handleResize}>Apply</Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Palette className="w-5 h-5"/>Filters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm">Brightness</label>
                      <Slider value={[brightness]} onValueChange={(v) => setBrightness(v[0])} min={0} max={200} />
                    </div>
                    <div>
                      <label className="text-sm">Contrast</label>
                      <Slider value={[contrast]} onValueChange={(v) => setContrast(v[0])} min={0} max={200} />
                    </div>
                    <div>
                      <label className="text-sm">Saturation</label>
                      <Slider value={[saturation]} onValueChange={(v) => setSaturation(v[0])} min={0} max={200} />
                    </div>
                    <div>
                      <label className="text-sm">Grayscale</label>
                      <Slider value={[grayscale]} onValueChange={(v) => setGrayscale(v[0])} min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-sm">Sepia</label>
                      <Slider value={[sepia]} onValueChange={(v) => setSepia(v[0])} min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-sm">Blur</label>
                      <Slider value={[blur]} onValueChange={(v) => setBlur(v[0])} min={0} max={10} step={0.1} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <Button onClick={handleDownload} className="w-full"><Download className="w-4 h-4 mr-2" />Download Image</Button>
                  <Button onClick={handleReset} variant="secondary" className="w-full"><RefreshCw className="w-4 h-4 mr-2" />Reset</Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          All processing happens in your browser. Your images are never uploaded to any server.
        </p>
      </div>
    </div>
  )
}

export default App

