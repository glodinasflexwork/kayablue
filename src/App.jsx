
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Upload, Download, RotateCw, Crop, Maximize, Palette, Archive, FileImage } from 'lucide-react'

import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [activeTab, setActiveTab] = useState('rotate')
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownload = () => {
    if (!image) return

    const a = document.createElement('a')
    a.href = image
    a.download = `kayablue-image-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleReset = () => {
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            KAYABLUE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Professional Image Editing Tools
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Image Preview */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden min-h-[400px]">
                  <img
                    src={image}
                    alt="Uploaded preview" 
                    className="max-w-full max-h-[600px] object-contain"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button onClick={handleDownload} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Image
                  </Button>
                  <Button onClick={handleReset} variant="secondary" className="w-full">
                    Upload New Image
                  </Button>
                </div>
              </div>

              {/* Tool Selection Tabs */}
              <div className="lg:col-span-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 lg:grid-cols-3 gap-2">
                    <TabsTrigger value="rotate" className="flex flex-col items-center gap-1 p-2">
                      <RotateCw className="w-5 h-5" />
                      <span className="text-xs">Rotate</span>
                    </TabsTrigger>
                    <TabsTrigger value="crop" className="flex flex-col items-center gap-1 p-2">
                      <Crop className="w-5 h-5" />
                      <span className="text-xs">Crop</span>
                    </TabsTrigger>
                    <TabsTrigger value="resize" className="flex flex-col items-center gap-1 p-2">
                      <Maximize className="w-5 h-5" />
                      <span className="text-xs">Resize</span>
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="flex flex-col items-center gap-1 p-2">
                      <Palette className="w-5 h-5" />
                      <span className="text-xs">Filters</span>
                    </TabsTrigger>
                    <TabsTrigger value="compress" className="flex flex-col items-center gap-1 p-2">
                      <Archive className="w-5 h-5" />
                      <span className="text-xs">Compress</span>
                    </TabsTrigger>
                    <TabsTrigger value="format" className="flex flex-col items-center gap-1 p-2">
                      <FileImage className="w-5 h-5" />
                      <span className="text-xs">Format</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="rotate" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Rotate Image</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Rotate your image by any angle.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="crop" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Crop Image</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select and crop a specific area of your image.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="resize" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Resize Image</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Change the dimensions of your image.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="filters" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Apply Filters</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Adjust brightness, contrast, saturation, and more.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="compress" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Compress Image</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reduce file size while maintaining quality.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="format" className="mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Convert Format</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Convert between PNG, JPEG, and WebP formats.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Coming soon...
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
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

