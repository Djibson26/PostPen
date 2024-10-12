'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '../../lib/firebaseConfig';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, getRedirectResult, signInWithRedirect } from "firebase/auth";
import { Download, Sun, Moon, Type, Upload, Palette, Paperclip, Image as ImageIcon, Send, LogIn, LogOut, X, Smile, AlignLeft, AlignCenter, AlignRight, Pen, Cpu } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

// Initialize Firebase
const storage = getStorage();
const db = getFirestore();

export default function ImageGenerator() {
  const [formState, setFormState] = useState({
    text: "🌟Let's make your post  more engaging!🚀",
    backgroundColor: 'black',
    fontColor: 'white',
    fontSize: 24,
    fontFamily: 'Inter',
    textX: 0,
    textY: 150,
    lineHeight: 1.2,
    maxWidth: 90,
    textAlign: 'center',
    outlineColor: '#000000',
    outlineWidth: 0,
    gradientStart: 'white',
    gradientEnd: 'white',
  });
  const [overlayImages, setOverlayImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [isMovingText, setIsMovingText] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAIMode, setIsAIMode] = useState(true);
  const textareaRef = useRef(null);
  const [textContainerSize, setTextContainerSize] = useState({ width: 300, height: 100 });
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const longPressTimeoutRef = useRef(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setUser(result.user);
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setAuthError(null);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error during auth initialization:', error);
        setAuthError('An error occurred during authentication. Please try again.');
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleInputChange = (key, value) => {
    if (!user) return;
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

  const handleAITextGeneration = async (prompt) => {
    if (!user || !prompt.trim()) return;
    setIsGeneratingText(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const basePrompt = "generate (1-3 lines) text with emojis, based on the following input. Make it easy to read."
      const result = await model.generateContent(basePrompt + prompt);
      const response = await result.response;
      const generatedText = response.text();
      setFormState(prev => ({ ...prev, text: generatedText }));
      setInputText('');
      drawCanvas();
    } catch (error) {
      console.error('Text generation failed:', error);
      alert('Failed to generate text. Please try again.');
    } finally {
      setIsGeneratingText(false);
    }
  };

  const uploadAndDownloadImage = async () => {
    if (!user) {
      alert("You need to be logged in to download images.");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');

      const timestamp = Date.now();
      const folderPath = `images/${user.uid}`;
      const storageRef = ref(storage, `${folderPath}/${timestamp}.png`);
      const snapshot = await uploadString(storageRef, imageDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);

      await saveUserDataToFirestore(downloadURL, folderPath, timestamp);

      const link = document.createElement('a');
      link.href = imageDataUrl;
      link.download = `generated-image-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("Image generated, saved, and downloaded successfully!");
    } catch (error) {
      console.error("Error generating, saving, or downloading image: ", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveUserDataToFirestore = async (imageUrl, folderPath, timestamp) => {
    if (!user) {
      console.error("No user logged in");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        lastGeneratedImage: imageUrl,
        imageFolderPath: folderPath,
        timestamp: new Date(timestamp)
      }, { merge: true });
      console.log("User data saved successfully");
    } catch (error) {
      console.error("Error saving user data: ", error);
    }
  };
  const drawTextWithEffects = (ctx, text, scale) => {
    const padding = 20 * scale; // Padding around the text
    const containerWidth = canvasRef.current.width - padding * 2; // Maximum width of the text container
  
    ctx.textAlign = formState.textAlign;
    ctx.font = `${formState.fontSize * scale}px ${formState.fontFamily}`;
    
    // Split text by lines based on Enter key
    const textLines = text.split('\n');
    
    let allLines = [];
  
    // Process each line (split by Enter key) individually for word wrapping
    textLines.forEach((textLine) => {
      const words = textLine.split(' ');
      let line = '';
      
      words.forEach((word) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
  
        // If the testLine exceeds the container width, push the current line and start a new one
        if (testWidth > containerWidth) {
          allLines.push(line.trim());
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
  
      // Push the last processed line
      allLines.push(line.trim());
    });
  
    // Calculate total text height
    const totalHeight = allLines.length * formState.fontSize * formState.lineHeight * scale + padding * 2;
  
    // Set textContainerSize based on measured width and height
    setTextContainerSize({
      width: containerWidth / scale, // Based on the canvas width minus padding
      height: totalHeight / scale
    });
  
    // Draw the background rectangle (transparent here)
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(formState.textX * scale, formState.textY * scale, textContainerSize.width * scale, textContainerSize.height * scale);
  
    // Draw each line of text
    let y = formState.textY * scale + padding;
    allLines.forEach((lineText) => {
      drawLine(ctx, lineText, formState.textX * scale + padding, y, scale, containerWidth);
      y += formState.fontSize * formState.lineHeight * scale;
    });
  };
  
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = `${formState.fontSize}px ${formState.fontFamily}`;
    
    const textMetrics = ctx.measureText(formState.text);
    const padding = 20;
    const width = textMetrics.width + padding * 2;
    const height = formState.fontSize * formState.lineHeight + padding * 2;
  
    setTextContainerSize({ width, height });
  }, [formState.text, formState.fontSize, formState.fontFamily, formState.lineHeight]);

  useEffect(() => {
    drawCanvas();
  }, [textContainerSize, formState]);
  
  
  const drawLine = (ctx, text, x, y, scale, maxWidth) => {
    ctx.fillStyle = ctx.createLinearGradient(x, y - formState.fontSize * scale, x, y);
    ctx.fillStyle.addColorStop(0, formState.gradientStart);
    ctx.fillStyle.addColorStop(1, formState.gradientEnd);

    if (formState.textAlign === 'center') {
      x += maxWidth / 2;
    } else if (formState.textAlign === 'right') {
      x += maxWidth;
    }

    if (formState.outlineWidth > 0) {
      ctx.strokeStyle = formState.outlineColor;
      ctx.lineWidth = formState.outlineWidth * scale;
      ctx.strokeText(text, x, y, maxWidth);
    }

    ctx.fillText(text, x, y, maxWidth);
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

    drawTextWithEffects(ctx, formState.text, scale);
  }, [formState, overlayImages, textContainerSize]);

  useEffect(() => {
    const resizeCanvas = () => {
      const container = canvasContainerRef.current;
      const canvas = canvasRef.current;
      const { width, height } = container.getBoundingClientRect();
      const size = Math.min(width, height, 500);
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

  const handleCanvasInteraction = (event) => {
    if (!user) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scale = window.devicePixelRatio;
    const x = ((event.clientX || event.touches[0].clientX) - rect.left) * scale;
    const y = ((event.clientY || event.touches[0].clientY) - rect.top) * scale;

    const clickedImageIndex = overlayImages.findIndex(img =>
      x >= img.x * scale && x <= (img.x + img.width) * scale &&
      y >= img.y * scale && y <= (img.y + img.height) * scale
    );

    if (clickedImageIndex !== -1) {
      setSelectedImage(clickedImageIndex);
      longPressTimeoutRef.current = setTimeout(() => {
        setIsMoving(true);
        lastMousePosRef.current = { x, y };
      }, 500);

      const img = overlayImages[clickedImageIndex];
      const edgeThreshold = 10 * scale;
      if (x >= (img.x + img.width) * scale - edgeThreshold && y >= (img.y + img.height) * scale - edgeThreshold) {
        setIsResizing(true);
        setResizeHandle('bottomRight');
      }
    } else {
      const textX = formState.textX * scale;
      const textY = formState.textY * scale;
      const textWidth = textContainerSize.width * scale;
      const textHeight = textContainerSize.height * scale;

      if  (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        longPressTimeoutRef.current = setTimeout(() => {
          setIsMovingText(true);
          lastMousePosRef.current = { x, y };
        }, 500);
      } else {
        setSelectedImage(null);
      }
    }
  };

  const handleCanvasMove = (event) => {
    if (!user || (!isMoving && !isResizing && !isMovingText)) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    const x = ((event.clientX || event.touches[0].clientX) - rect.left) * scale;
    const y = ((event.clientY || event.touches[0].clientY) - rect.top) * scale;

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
      const dx = (x - lastMousePosRef.current.x) / scale;
      const dy = (y - lastMousePosRef.current.y) / scale;

      setFormState(prev => ({
        ...prev,
        textX: Math.max(0, Math.min(canvas.width / scale - textContainerSize.width, prev.textX + dx)),
        textY: Math.max(0, Math.min(canvas.height / scale - textContainerSize.height, prev.textY + dy))
      }));

      lastMousePosRef.current = { x, y };
    }

    drawCanvas();
  };

  const handleCanvasEnd = () => {
    clearTimeout(longPressTimeoutRef.current);
    if (isMoving || isResizing) {
      setIsEditingImage(true);
    } else if (isMovingText) {
      setIsEditingText(true);
    }
    setIsMoving(false);
    setIsResizing(false);
    setIsMovingText(false);
    setResizeHandle(null);
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('User signed in:', result.user);
      setUser(result.user);
      setIsSidebarOpen(false);
    } catch (popupError) {
      console.error('Error during Google sign-in with popup:', popupError.message);
    }
  };

  const handleInputSubmit = () => {
    if (inputText.trim()) {
      if (isAIMode) {
        handleAITextGeneration(inputText);
      } else {
        setFormState(prev => ({ ...prev, text: inputText }));
        drawCanvas();
      }
    }
  };

  const toggleAIMode = () => {
    setIsAIMode(!isAIMode);
    setInputText(isAIMode ? formState.text : '');
  };

  const handleClickOutside = (event) => {
    if (activeSection && !event.target.closest('.section-content') && !event.target.closest('.options-button')) {
      setActiveSection(null);
    }
    if (showEmojiPicker && !event.target.closest('.emoji-picker-container') && !event.target.closest('.emoji-button')) {
      setShowEmojiPicker(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSection, showEmojiPicker]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setInputText(newText);
    if (!isAIMode) {
      setFormState(prev => ({ ...prev, text: newText }));
      drawCanvas();
    }
  };

  const addEmoji = (emojiObject) => {
    const emoji = emojiObject.emoji;
    const newText = inputText + emoji;
    setInputText(newText);
    if (!isAIMode) {
      setFormState(prev => ({ ...prev, text: newText }));
      drawCanvas();
    }
    setShowEmojiPicker(false);
  };
  return (
    <div className={`container ${isDarkMode ? 'dark' : 'light'}`}>
      <style jsx>{`
        .container {
          font-family: 'Inter', sans-serif;
          max-width: 100%;
          margin: 0;
          padding: 20px;
          color: #333;
          background-color: #ffffff;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .dark {
          background-color: #292828;
          color: #e2e8f0;
        }
        .light {
          background-color: white;
          color: black;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #ffffff;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: 60px;
        }
        h1 {
          font-size: 24px;
          margin: 0;
          color: #D2A76A;
        }
        .header-buttons {
          display: flex;
          gap: 10px;
        }
        .dark button {
          background-color: #D2A76A;
          color: black;
        }
        .light button {
          background-color: #f0f0f0;
          color: black;
        }
        .light h1 {
          font-size: 24px;
          margin: 0;
          color: white;
        }
        .dark header {
          background-color: #1a1a1a;
        }
        .light header {
          background-color: #D2A76A;
        }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 50%;
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
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 80px;
          margin-bottom: 80px;
        }
        .canvas-container {
          width: 100%;
          max-width: 500px;
          height: 500px;
          margin: 0 auto;
          background-color: #f0f0f0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 10;
        }
        .dark .canvas-container {
          background-color: #1a1a1a;
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .bottom-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #4a5568;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
        }
        .dark .bottom-toolbar {
          background-color: #1a1a1a;
        }
        .light .bottom-toolbar {
          background-color: #D2A76A;
        }
        .input-container {
          display: flex;
          align-items: center;
          background-color: white;
          border-radius: 20px;
          padding: 5px 10px;
          flex-grow: 1;
          margin-right: 10px;
        }
        .dark .input-container {
          background-color: #333;
        }
        .input-container textarea {
          border: none;
          outline: none;
          flex-grow: 1;
          font-size: 16px;
          padding: 5px;
          resize: none;
          overflow: hidden;
          min-height: 24px;
          max-height: 100px;
          background-color: transparent;
          color: inherit;
        }
        .mode-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
        }
        .paperclip-button, .generate-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
        }
        .generate-button {
          background-color: #D2A76A;
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .emoji-picker-container {
          position: absolute;
          bottom: 70px;
          left: 10px;
          z-index: 1000;
        }
        .section-content {
          padding: 20px;
          background-color: #f0f0f0;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          max-height: 300px;
          overflow-y: auto;
          z-index: 900;
        }
        .dark .section-content {
          background-color: #333333;
        }
        textarea, select, input[type="range"] {
          width: 70%;
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid #4a5568;
          border-radius: 5px;
          background-color: #ffffff;
          color: black;
        }
        .dark textarea, .dark select, .dark input[type="range"] {
          background-color: #1a1a1a;
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
        .logoImg {
          max-width: 40px;
          height: 40px;
          margin-right: 10px;
          box-shadow: 0 4px 8px rgba(255,255,255,0.1);
          border-radius: 50%;
        }
        .logo {
          display: flex;
          align-items: center;
        }
        .app_name {
          margin: 0;
        }
        .section-content {
          font-size: 15px;
        }
        .section-buttons {
          display: flex;
          justify-content: space-around;
          margin-bottom: 10px;
        }
        .section-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
        }
        .section-button svg {
          margin-bottom: 5px;
        }
        .light .profile-button{
          background-color: white;
          color: black;
        }
        .profile-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #D2A76A;
          color: black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
        }
        .sidebar {
          position: fixed;
          top: 0;
          right: ${isSidebarOpen ? '0' : '-500px'};
          width: 300px;
          height: 100%;
          background-color: #ffffff;
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
          transition: right 0.3s ease-in-out;
          z-index: 1001;
          padding: 20px;
        }
        .dark .sidebar {
          background-color: #1a1a1a;
          color: #e2e8f0;
        }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dark .sidebar-button{
            color: black;
        }
        .sidebar-button {
          padding: 10px;
          border: none;
          border-radius: 5px;
          background-color: #D2A76A;
          color: white;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .sidebar-button:hover {
          background-color: #b88e59;
        }
        .light .section-content button {
          background-color: #D2A76A;
          color: black;
        }
        .mode-toggle {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 1000;
        }
        .color-pickers {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
        }
        .color-picker {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 10px;
          border: red;
          border-radius: 0%;
          
        }
        .color-picker input[type="color"] {
          width: 50px;
          height: 50px;
          border: none;
          border-radius: 0%;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .color-picker span {
          margin-top: 5px;
          font-size: 12px;
        }
        .paperclip-button{
          margin-left: 10px;
        }
        .paperclip-contents-div{
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .text-alignment{
          display: flex;
          flex-direction: row;
          justify-content: space-around;
        }
        #paperclip-section-content {
          padding: 20px;
          background-color: #f0f0f0;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          height: 200px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 900;
        }
        #color-section-content{
          padding: 20px;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          height: 200px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 900;
        }
        #image-section-content{
          padding: 20px;
          background-color: #f0f0f0;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          height: 200px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 900;
        
        }
        #font-section{
          height: 250px;

        }
        .dark  #paperclip-section-content{  
          background-color: #333333;  
        
        }
       .dark  #image-section-content{  
          background-color: #333333;  
        
        } 
         
        @media (max-width: 768px) {
          .header-buttons {
            flex-wrap: wrap;
          }
          .canvas-container {
            max-width: 100%;
            height: auto;
            aspect-ratio: 1 / 1;
          }
        }
      `}</style>
      <header>
        <div className='logo'>
          <img src="/larg.png" alt="PostPen App Interface" className='logoImg' />
          <h1 className='app_name'>PostPen</h1>
        </div>
        <div className="header-buttons">
          {user ? (
            <button onClick={uploadAndDownloadImage} disabled={isGenerating}>
              <Download size={18}  />
            </button>
          ) : (
            <button onClick={() => alert("Please log in to download images")}>
              <Download size={18} />
            </button>
          )}
          <button onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="profile-button" onClick={toggleSidebar}>
            {user ? user.displayName.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
      </header>
      <main>
        <div className="canvas-container" ref={canvasContainerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasInteraction}
            onMouseMove={handleCanvasMove}
            onMouseUp={handleCanvasEnd}
            onMouseLeave={handleCanvasEnd}
            onTouchStart={handleCanvasInteraction}
            onTouchMove={handleCanvasMove}
            onTouchEnd={handleCanvasEnd}
          />
          <button className="mode-toggle" onClick={toggleAIMode}>
            {isAIMode ? <Pen size={18} /> : <Cpu size={18} />}
          </button>
        </div>
      </main>
      <div className="bottom-toolbar">
        <div className="input-container">
          <div className="mode-icon">
            {isAIMode ? <Cpu size={18} /> : <Pen size={18} />}
          </div>
          <textarea
            ref={textareaRef}
            value={isAIMode ? inputText : formState.text}
            onChange={handleTextChange}
            placeholder={isAIMode ? "Enter prompt for AI text generation" : "Type your message..."}
            rows={1}
          />
          <button className="paperclip-button" onClick={() => toggleSection('options')}>
            <Paperclip size={18} />
          </button>
        </div>
        <button className="generate-button" onClick={handleInputSubmit}>
          <Send size={18} />
        </button>
      </div>
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={addEmoji} />
        </div>
      )}
      {activeSection === 'options' && (
        <div id="paperclip-section-content" className="section-content">
          <div className="section-buttons">
          
          <div className='paperclip-contents-div'>
            <button className="section-button" onClick={() => toggleSection('color')}>
              <Palette size={18} />
             
            </button>
            <span>Colors</span>
          </div>
          
          <div className='paperclip-contents-div'>
            <button className="section-button" onClick={() => toggleSection('font')}>
              <Type size={18} />
            </button>
            <span>Font</span>
          </div>
          <div className='paperclip-contents-div'>
            <button className="section-button" onClick={() => setShowEmojiPicker(true)}>
              <Smile size={18} />
            </button>
            <span>Emoji</span>
          </div>
          </div>
        </div>
      )}
      {activeSection === 'image' && (
        <div className="section-content" id='image-section-content'>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="image-upload"
            disabled={!user}
          />
          <label htmlFor="image-upload">{user ? "Upload Image" : "Log in to upload images"}</label>
          {overlayImages.map((img, index) => (
            <div key={index} className="overlay-image-control">
              <span>Image {index + 1}</span>
              <select
                value={img.shape}
                onChange={(e) => updateOverlayImage(index, { shape: e.target.value })}
                disabled={!user}
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
              <input
                type="range"
                min="20"
                max="300"
                value={img.width}
                onChange={(e) => updateOverlayImage(index, { width: Number(e.target.value), height: Number(e.target.value) })}
                disabled={!user}
              />
              <button onClick={() => deleteOverlayImage(index)} disabled={!user}>
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {activeSection === 'color' && (
        <div className="section-content" id='color-section-content'>
          <div className="color-pickers">
            <div className="color-picker">
              <input
                type="color"
                value={formState.backgroundColor}
                onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                disabled={!user}
              />
              <span>Background</span>
            </div>
            <div className="color-picker">
              <input
                type="color"
                value={formState.fontColor}
                onChange={(e) => handleInputChange('fontColor', e.target.value)}
                disabled={!user}
              />
              <span>Font</span>
            </div>
            <div className="color-picker">
              <input
                type="color"
                value={formState.gradientStart}
                onChange={(e) => handleInputChange('gradientStart', e.target.value)}
                disabled={!user}
              />
              <span>Gradient Start</span>
            </div>
            <div className="color-picker">
              <input
                type="color"
                value={formState.gradientEnd}
                onChange={(e) => handleInputChange('gradientEnd', e.target.value)}
                disabled={!user}
              />
              <span>Gradient End</span>
            </div>
          </div>
        </div>
      )}
      {activeSection === 'font' && (
        <div className="section-content" id='font-section'>
          <select
            value={formState.fontFamily}
            onChange={(e) => handleInputChange('fontFamily', e.target.value)}
            disabled={!user}
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
            disabled={!user}
          />
          <span>{formState.fontSize}px</span>
          <div className='text-alignment'>
            <button onClick={() => handleInputChange('textAlign', 'left')} disabled={!user}>
              <AlignLeft size={18} />
            </button>
            <button onClick={() => handleInputChange('textAlign', 'center')} disabled={!user}>
              <AlignCenter size={18} />
            </button>
            <button onClick={() => handleInputChange('textAlign', 'right')} disabled={!user}>
              <AlignRight size={18} />
            </button>
          </div>
        </div>
      )}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Profile</h2>
          <button onClick={toggleSidebar}>
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-content">
          {user ? (
            <>
              <p>Welcome, {user.displayName}!</p>
              <p>{user.email}</p>
              <button className="sidebar-button" onClick={handleLogout}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="sidebar-button" onClick={handleLogin}>
              <LogIn size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}