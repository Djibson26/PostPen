'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '../../lib/firebaseConfig';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Download, Sun, Moon, Minus, Plus, Type, Pen, Palette, Image as ImageIcon, Send, LogIn, LogOut, X } from 'lucide-react';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

// Initialize Firebase
const storage = getStorage();
const db = getFirestore();

export default function ImageGenerator() {
  const [formState, setFormState] = useState({
    text: '🌟Let’s make your post \n more engaging!🚀',
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
  const [user, setUser] = useState(null);
  const [aiCredits, setAiCredits] = useState(5);
  const [downloadCredits, setDownloadCredits] = useState(5);
  const [nextResetTime, setNextResetTime] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserCredits(currentUser.uid);
      } else {
        setUser(null);
        setAiCredits(5);
        setDownloadCredits(5);
        setNextResetTime(null);
        setFormState(prev => ({ ...prev, text: '🌟 Ready to elevate your post? Let’s make it more engaging! 🚀' }));
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchWorldTime = async () => {
    try {
      const response = await fetch('https://worldtimeapi.org/api/ip');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching world time:', error);
      throw new Error('Failed to fetch world time');
    }
  };

  const calculateNextResetTime = (currentTime) => {
    const nextDay = new Date(currentTime.datetime);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay.toISOString();
  };

  const fetchUserCredits = async (userId) => {
    const userDoc = await getDoc(doc(db, "users", userId));
    const worldTime = await fetchWorldTime();

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const lastResetTime = userData.lastResetTime?.seconds * 1000 || 0;
      const nextResetTime = calculateNextResetTime(worldTime);

      setAiCredits(userData.aiCredits || 5);
      setDownloadCredits(userData.downloadCredits || 5);
      setNextResetTime(nextResetTime);

      if (new Date(worldTime.datetime) >= new Date(nextResetTime)) {
        // Reset credits if the reset time has passed
        await resetUserCredits(userId);
      }
    } else {
      // If it's a new user, initialize their credits
      await initializeUserCredits(userId);
    }
  };

  const resetUserCredits = async (userId) => {
    const userRef = doc(db, "users", userId);
    const worldTime = await fetchWorldTime();
    const nextResetTime = calculateNextResetTime(worldTime);

    const resetData = {
      aiCredits: 5,
      downloadCredits: 5,
      lastResetTime: { seconds: worldTime.unixtime, nanoseconds: 0 },
      nextResetTime: nextResetTime,
    };

    await updateDoc(userRef, resetData);

    setAiCredits(resetData.aiCredits);
    setDownloadCredits(resetData.downloadCredits);
    setNextResetTime(nextResetTime);
  };

  const initializeUserCredits = async (userId) => {
    const worldTime = await fetchWorldTime();
    const nextResetTime = calculateNextResetTime(worldTime);
    const initialCredits = {
      aiCredits: 5,
      downloadCredits: 5,
      lastResetTime: { seconds: worldTime.unixtime, nanoseconds: 0 },
      nextResetTime: nextResetTime,
    };

    await setDoc(doc(db, "users", userId), initialCredits);
    setAiCredits(initialCredits.aiCredits);
    setDownloadCredits(initialCredits.downloadCredits);
    setNextResetTime(nextResetTime);
  };

  const updateUserCredits = async (newAiCredits, newDownloadCredits) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const worldTime = await fetchWorldTime();
    
    try {
      await updateDoc(userRef, {
        aiCredits: newAiCredits,
        downloadCredits: newDownloadCredits,
        lastUpdateTime: { seconds: worldTime.unixtime, nanoseconds: 0 },
      });

      setAiCredits(newAiCredits);
      setDownloadCredits(newDownloadCredits);
    } catch (error) {
      console.error("Error updating credits:", error);
      alert("Failed to update credits. Please try again.");
    }
  };

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

  const handleAITextGeneration = async () => {
    if (!user || !aiPrompt || aiCredits <= 0) return;
    setIsGeneratingText(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const generatedText = response.text();
      setFormState(prev => ({ ...prev, text: generatedText }));
      await updateUserCredits(aiCredits - 1, downloadCredits);
    } catch (error) {
      console.error('Text generation failed:', error);
      alert('Failed to generate text. Please try again.');
    } finally {
      setIsGeneratingText(false);
    }
  };

  const uploadAndDownloadImage = async () => {
    if (!user || downloadCredits <= 0) {
      alert("You don't have enough credits or you're not logged in.");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');

      const worldTime = await fetchWorldTime();
      const timestamp = worldTime.unixtime;

      // Upload to Firebase Storage
      const folderPath = `images/${user.uid}`;
      const storageRef = ref(storage, `${folderPath}/${timestamp}.png`);
      const snapshot = await uploadString(storageRef, imageDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save user data to Firestore
      await saveUserDataToFirestore(downloadURL, folderPath, timestamp);

      // Trigger download
      const link = document.createElement('a');
      link.href = imageDataUrl; // Use the canvas data URL directly
      link.download = `generated-image-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await updateUserCredits(aiCredits, downloadCredits - 1);

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
        timestamp: { seconds: timestamp, nanoseconds: 0 }
      }, { merge: true });
      console.log("User data saved successfully");
    } catch (error) {
      console.error("Error saving user data: ", error);
    }
  };

  const drawTextWithEffects = (ctx, text, scale) => {
    const lines = text.split('\n');
    const lineHeight = formState.fontSize * formState.lineHeight * scale;
    
    ctx.textAlign = formState.textAlign;
    ctx.font = `${formState.fontSize * scale}px ${formState.fontFamily}`;
    
    const gradient = ctx.createLinearGradient(0, formState.textY * scale, 0, formState.textY * scale + lineHeight * lines.length);
    gradient.addColorStop(0, formState.gradientStart);
    gradient.addColorStop(1, formState.gradientEnd);

    lines.forEach((line, index) => {
      const yPos = formState.textY * scale + index * lineHeight;
      let xPos;
      if (formState.textAlign === 'center') {
        xPos = ctx.canvas.width / 2;
      } else if (formState.textAlign === 'right') {
        xPos = ctx.canvas.width - formState.textX * scale;
      } else {
        xPos = formState.textX * scale;
      }

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

    drawTextWithEffects(ctx, formState.text, scale);
  }, [formState, overlayImages, zoom]);

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

  const  handleCanvasInteraction = (event) => {
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
      setIsMoving(true);
      lastMousePosRef.current = { x, y };

      const img = overlayImages[clickedImageIndex];
      const edgeThreshold = 10 * scale;
      if (x >= (img.x + img.width) * scale - edgeThreshold && y >= (img.y + img.height) * scale - edgeThreshold) {
        setIsResizing(true);
        setResizeHandle('bottomRight');
      }
    } else {
      const textX = formState.textX * scale;
      const textY = formState.textY * scale;
      const ctx = canvas.getContext('2d');
      const textWidth = ctx.measureText(formState.text).width;
      const textHeight = formState.fontSize * scale;

      if (x >= textX && x <= textX + textWidth && y >= textY - textHeight && y <= textY) {
        setIsMovingText(true);
        lastMousePosRef.current = { x, y };
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
        textX: Math.max(0, Math.min(canvas.width / scale, prev.textX + dx)),
        textY: Math.max(prev.fontSize, Math.min(canvas.height / scale, prev.textY + dy))
      }));

      lastMousePosRef.current = { x, y };
    }

    drawCanvas();
  };

  const handleCanvasEnd = () => {
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
      // Fetch user credits after successful login
      await fetchUserCredits(result.user.uid);
    } catch (error) {
      console.error('Error during Google sign-in:', error.message);
      alert('Failed to sign in. Please try again.');
    }
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
          z-index: 1000;
          height: 60px;
        }
        .dark .bottom-toolbar {
          background-color: #1a1a1a;
        }
        .light .bottom-toolbar {
          background-color: #D2A76A;
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
        .section-content button{
          font-size: 4px;
          margin:8px;
        }
        .credits-info {
          margin-top: 20px;
          text-align: center;
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
        .light .section-content Button{
         
          background-color: #D2A76A;
          color: black;
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
            <button onClick={uploadAndDownloadImage} disabled={isGenerating || downloadCredits <= 0}>
              <Download size={18} />
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
        {user && (
          <div className="credits-info">
            <p>AI Credits: {aiCredits}</p>
            <p>Download Credits: {downloadCredits}</p>
            {nextResetTime && (
              <p>Next reset: {new Date(nextResetTime).toLocaleString()}</p>
            )}
          </div>
        )}
      </main>
      <div className="bottom-toolbar">
        <button onClick={() => toggleSection('text')}>
          <Pen size={18} />
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
          <label>AI text generator</label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={user ? "Enter prompt for AI text generation..." : "🌟 Ready to elevate your post? Let’s make it more engaging! 🚀"}
            disabled={!user}
          />
          <button onClick={handleAITextGeneration} disabled={isGeneratingText || aiCredits <= 0 || !user}>
            <Send size={18} />
            {isGeneratingText ?  'Generating...' : ''}
          </button>
          <textarea
            value={formState.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder={user ? "Edit generated text here..." : "Please log in to edit text"}
            disabled={!user}
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
              <button onClick={() => deleteOverlayImage(index)} disabled={!user}>
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
              disabled={!user}
            />
          </label>
          <label>
            Font Color:
            <input
              type="color"
              value={formState.fontColor}
              onChange={(e) => handleInputChange('fontColor', e.target.value)}
              disabled={!user}
            />
          </label>
          <label>
            Gradient Start:
            <input
              type="color"
              value={formState.gradientStart}
              onChange={(e) => handleInputChange('gradientStart', e.target.value)}
              disabled={!user}
            />
          </label>
          <label>
            Gradient End:
            <input
              type="color"
              value={formState.gradientEnd}
              onChange={(e) => handleInputChange('gradientEnd', e.target.value)}
              disabled={!user}
            />
          </label>
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
              <p>Name: {user.displayName}</p>
              <p>Email: {user.email}</p>
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