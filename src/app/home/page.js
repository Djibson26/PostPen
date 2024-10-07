'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Download, Share2, Sun, Moon, Minus, Plus, Type, Palette, Image as ImageIcon, Send, Twitter, Facebook, Linkedin } from 'lucide-react';

// Initialize the Gemini API
// Replace 'YOUR_API_KEY' with your actual Gemini API key
const genAI = new GoogleGenerativeAI('AIzaSyDdw5ohLMATca60VGzF1Wk2mdS2kHAayYE');

export default function ImageGenerator() {
  const [formState, setFormState] = useState({
    text: 'Enter your text here',
    backgroundColor: 'black',
    fontColor: 'white',
    fontSize: 24,
    fontFamily: 'Inter',
    textX: 50,
    textY: 50,
    lineHeight: 1.2,
    maxWidth: 90,
    textAlign: 'center',
    outlineColor: '#000000',
    outlineWidth: 0,
    gradientStart: 'white',
    gradientEnd: 'white',
  });
  const [overlayImages, setOverlayImages] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [isMovingText, setIsMovingText] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleInputChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOverlayImages((prev) => [...prev, {
          src: reader.result,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          shape: 'rectangle'
        }]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const updateOverlayImage = (index, updates) => {
    setOverlayImages((prev) => prev.map((img, i) => 
      i === index ? { ...img, ...updates } : img
    ));
  };

  const deleteOverlayImage = (index) => {
    setOverlayImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedImage === index) {
      setSelectedImage(null);
    }
  };

  const generateImage = () => {
    const canvas = canvasRef.current;
    const imageDataUrl = canvas.toDataURL('image/png');
    setImageUrl(imageDataUrl);
  };

  const downloadImage = useCallback(() => {
    generateImage();
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [imageUrl]);

  const shareImage = (platform) => {
    generateImage();
    if (imageUrl) {
      let shareUrl;
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(imageUrl)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(imageUrl)}`;
          break;
        default:
          return;
      }
      window.open(shareUrl, '_blank');
    }
  };

  const drawTextWithEffects = (ctx, text, x, y, scale) => {
    const lines = text.split('\n');
    const lineHeight = formState.fontSize * formState.lineHeight * scale;
    
    ctx.textAlign = formState.textAlign;
    ctx.font = `${formState.fontSize * scale}px ${formState.fontFamily}`;
    
    const gradient = ctx.createLinearGradient(0, y, 0, y + lineHeight * lines.length);
    gradient.addColorStop(0, formState.gradientStart);
    gradient.addColorStop(1, formState.gradientEnd);

    lines.forEach((line, index) => {
      const yPos = y + index * lineHeight;
      const xPos = formState.textAlign === 'center' ? ctx.canvas.width / 2 :
                   formState.textAlign === 'right' ? ctx.canvas.width - x : x;

      if (formState.outlineWidth > 0) {
        ctx.strokeStyle = formState.outlineColor;
        ctx.lineWidth = formState.outlineWidth * scale;
        ctx.strokeText(line, xPos, yPos);
      }

      ctx.fillStyle = gradient;
      ctx.fillText(line, xPos, yPos);
    });
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = window.devicePixelRatio;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = formState.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    overlayImages.forEach((img) => {
      const image = new Image();
      image.src = img.src;
      image.onload = () => {
        ctx.save();
        ctx.translate(img.x * scale + (img.width * scale) / 2, img.y * scale + (img.height * scale) / 2);
        ctx.rotate((img.rotation * Math.PI) / 180);
        if (img.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, Math.min(img.width, img.height) * scale / 2, 0, Math.PI * 2);
          ctx.clip();
        }
        ctx.drawImage(image, -(img.width * scale) / 2, -(img.height * scale) / 2, img.width * scale, img.height * scale);
        ctx.restore();
      };
    });

    const xPos = (formState.textX / 100) * canvas.width;
    const yPos = (formState.textY / 100) * canvas.height;
    drawTextWithEffects(ctx, formState.text, xPos, yPos, scale);
  }, [formState, overlayImages, zoom]);

  useEffect(() => {
    const resizeCanvas = () => {
      const container = canvasContainerRef.current;
      const canvas = canvasRef.current;
      const { width} = container.getBoundingClientRect();
      const size = Math.min(width, 600); // Set maximum size to 800px
      const scale = window.devicePixelRatio;

      canvas.width = size * scale;
      canvas.height = size * scale;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      drawCanvas();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark');
  };

  const handleCanvasMouseDown = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;

    const clickedImageIndex = overlayImages.findIndex(img => 
      x >= img.x * scale && x <= (img.x + img.width) * scale &&
      y >= img.y * scale && y <= (img.y + img.height) * scale
    );

    if (clickedImageIndex !== -1) {
      setSelectedImage(clickedImageIndex);
      setIsMoving(true);
      lastMousePosRef.current = { x, y };

      // Check if click is near the edge for resizing
      const img = overlayImages[clickedImageIndex];
      const edgeThreshold = 10 * scale;
      if (x >= (img.x + img.width) * scale - edgeThreshold && y >= (img.y + img.height) * scale - edgeThreshold) {
        setIsResizing(true);
        setResizeHandle('bottomRight');
      }
    } else {
      // Check if click is on text
      const textX = (formState.textX / 100) * canvas.width;
      const textY = (formState.textY / 100) * canvas.height;
      const ctx = canvas.getContext('2d');
      const textWidth = ctx.measureText(formState.text).width;
      const textHeight = formState.fontSize * scale;

      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        setIsMovingText(true);
        lastMousePosRef.current = { x, y };
      } else {
        setSelectedImage(null);
      }
    }
  };

  const handleCanvasMouseMove = (event) => {
    if (!isMoving && !isResizing && !isMovingText) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;

    if (isMoving) {
      const dx = (x - lastMousePosRef.current.x) / scale;
      const dy = (y - lastMousePosRef.current.y) / scale;

      updateOverlayImage(selectedImage, { 
        x: overlayImages[selectedImage].x + dx,
        y: overlayImages[selectedImage].y + dy
      });

      lastMousePosRef.current = { x, y };
    } else if (isResizing) {
      const img = overlayImages[selectedImage];
      if (resizeHandle === 'bottomRight') {
        updateOverlayImage(selectedImage, {
          width: Math.max(20, (x / scale) - img.x),
          height: Math.max(20, (y / scale) - img.y)
        });
      }
    } else if (isMovingText) {
      const dx = x - lastMousePosRef.current.x;
      const dy = y - lastMousePosRef.current.y;

      setFormState(prev => ({
        ...prev,
        textX: Math.max(0, Math.min(100, prev.textX + (dx / canvas.width) * 100)),
        textY: Math.max(0, Math.min(100, prev.textY + (dy / canvas.height) * 100))
      }));

      lastMousePosRef.current = { x, y };
    }

    drawCanvas();
  };

  const handleCanvasMouseUp = () => {
    setIsMoving(false);
    setIsResizing(false);
    setIsMovingText(false);
    setResizeHandle(null);
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleAITextGeneration = async () => {
    if (!aiPrompt) return;
    setIsGeneratingText(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const generatedText = response.text();
      setFormState(prev => ({ ...prev, text: generatedText }));
    } catch (error) {
      console.error('Text generation failed:', error);
      alert('Failed to generate text. Please try again.');
    } finally {
      setIsGeneratingText(false);
    }
  };

  return (
    <div className={`container ${isDarkMode ? 'dark' : 'ligth'}`}>
      <style jsx>{`
        .container {
          font-family: 'Inter', sans-serif;
          max-width: 1200px;
          margin: 0 0;
          padding: 20px;
          color: #333;
          background-color: red;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          left: 0;
          rigth: 0;
        }
        .dark {
          background-color: #292828;
          color: #e2e8f0;
        }
        .ligth {
          background-color: white;
          color: black;
          left: 0;
          rigth: 0;
          
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0px;
          margin-top: 0px;
          padding: 10px;
          background-color: white;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
        }
        h1 {
          font-size: 14px;
          margin: 0;
          color: #D2A76A;
        }
        .header-buttons {
          display: flex;
          gap: 10px;
        }
        .ligth  button{
           background-color: white;  
           color: black;
        }
        .dark  button{
           background-color: #D2A76A;  
           color: black;
        }
        .dark header{
          background-color: #1a1a1a;
        }
        .ligth header{
          background-color: #D2A76A;
          color: #D2A76A;
      }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 50%;
          background-color: white;
          color: white;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        button:hover {
          background-color: #2d3748;
        }
        button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }
        .ligth .app_name{
          color: white;
        }
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          left: 0;
          rigth: 0;
          gap: 20px;
          
        }
        .canvas-container {
          
          width: 100%;
          max-width: 300px;
          heigth: 10%;
          max-heigth: 100px;
          margin-top: 100px;
          margin: 0 auto;
          left: 0;
          rigth: 0;
          background-color: red;
          box-shadow: 0 4px 6px rgba(0, 0, 0, black);
        }
        .dark .canvas-container {
          background-color: #1a1a1a;
        }
        canvas {
          position: fixed;
          display: block;
          margin-top: 120px;
          width: 300px;
        }
        .zoom-controls {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .bottom-toolbar {
          display: flex;
          justify-content: space-around;
          padding: 10px;
          background-color: #4a5568;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
        }
        .dark .bottom-toolbar {
          background-color: #1a1a1a;
        }
        .ligth .bottom-toolbar {
          background-color: #D2A76A;
        }
        .section-content {
          padding: 20px;
          background-color: #D2A76A;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .dark .section-content {
          background-color: #1a1a1a;
        }
        textarea, select, input[type="range"] {
          width: 70%;
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid #4a5568;
          border-radius: 5px;
          background-color: #FFE5AD;
          color: black;
        }
        .dark textarea, .dark select, .dark input[type="range"] {
          background-color: #333333;
          color: #e2e8f0;
        }
        .overlay-image-control {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        input[type="color"] {
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
        }
        .logoImg{
            maxWidth: 40px;
            height: 40px;
            margin-right: 5px;
            box-shadow: 0 4px 8px rgba(255,255,255,0.1);
            border-radius: 100%;
            right:0;
          }
          .logo{
            display: flex;
            alignItems: center;
            justifyContent: space-around;
            maxWidth: 1200px;
            margin: 0px;
            padding: 0px;
          }
          .app_name {
            margin-top: 12px;
          }
          .section-content button{
            font-size:5px;
            margin: 10px;

          }
        @media (max-width: 768px) {
          .header-buttons {
            flex-wrap: wrap;
            }
          .app_name{
            size: 10%;
            color: #D2A76A;
          }
          .canvas-container {
            
            width: 100%;
            max-width: 200px;
            max-heigth: 100px;
            margin-top: 520px;
            margin: 0 auto;
            background-color: red;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
            canvas {
              display: block;
              margin-top: 200px;
              width: 10px;
              heigth: 10%;
            }

        }
      `}</style>
      <header>
      <div className='logo'><img src="/larg.png" alt="PostPen App Interface" className='logoImg' /><h1 className='app_name'>PostPen</h1>
                        </div>
        <div className="header-buttons">
          <button onClick={downloadImage}>
            <Download size={18} />
          </button>
          <button onClick={() => shareImage('twitter')}>
            <Twitter size={18} />
          </button>
          <button onClick={() => shareImage('facebook')}>
            <Facebook size={18} />
          </button>
          <button onClick={() => shareImage('linkedin')}>
            <Linkedin size={18} />
          </button>
          <button onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main>
        <div className="canvas-container" ref={canvasContainerRef}>
          <canvas 
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          <div className="zoom-controls">
            <button onClick={() => setZoom(Math.max(zoom - 10, 10))}>
              <Minus size={18} />
            </button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom(Math.min(zoom + 10, 200))}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </main>
      <div className="bottom-toolbar">
        <button onClick={() => toggleSection('text')}>
          <Type size={18} />
        </button>
        <button onClick={() => toggleSection('image')}>
          <ImageIcon size={18} />
        </button>
        <button onClick={() => toggleSection('font')}>
          <Type size={18} />
        </button>
        <button onClick={() => toggleSection('color')}>
          <Palette size={18} />
        </button>
      </div>
      {activeSection === 'text' && (
        <div className="section-content">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter prompt for AI text generation..."
          />
          <button onClick={handleAITextGeneration} disabled={isGeneratingText}>
            <Send size={18} />
            {isGeneratingText ? 'Generating...' : ''}
          </button>
          <textarea
            value={formState.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Edit generated text here..."
          />
        </div>
      )}
      {activeSection === 'image' && (
        <div className="section-content">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="image-upload"
          />
          <label htmlFor="image-upload">Upload Image</label>
          {overlayImages.map((img, index) => (
            <div key={index} className="overlay-image-control">
              <span>Image {index + 1}</span>
              <select
                value={img.shape}
                onChange={(e) => updateOverlayImage(index, { shape: e.target.value })}
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
              <button onClick={() => deleteOverlayImage(index)}>
                <Minus size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {activeSection === 'font' && (
        <div className="section-content">
          <select
            value={formState.fontFamily}
            onChange={(e) => handleInputChange('fontFamily', e.target.value)}
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Poppins">Poppins</option>
          </select>
          <input
            type="range"
            min="10"
            max="100"
            value={formState.fontSize}
            onChange={(e) => handleInputChange('fontSize', Number(e.target.value))}
          />
          <span>{formState.fontSize}px</span>
        </div>
      )}
      {activeSection === 'color' && (
        <div className="section-content">
          <label>
            Background:
            <input
              type="color"
              value={formState.backgroundColor}
              onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
            />
          </label>
          <label>
            Font Color:
            <input
              type="color"
              value={formState.fontColor}
              onChange={(e) => handleInputChange('fontColor', e.target.value)}
            />
          </label>
          <label>
            Gradient Start:
            <input
              type="color"
              value={formState.gradientStart}
              onChange={(e) => handleInputChange('gradientStart', e.target.value)}
            />
          </label>
          <label>
            Gradient End:
            <input
              type="color"
              value={formState.gradientEnd}
              onChange={(e) => handleInputChange('gradientEnd', e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}