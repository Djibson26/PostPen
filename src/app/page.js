'use client';

import Head from 'next/head'; // Import the Head component
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Adjusted for Next.js 13+ to use next/navigation
import { auth } from '../lib/firebaseConfig'; // Adjust the path as necessary
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

export default function LandingPage() {
const [isMobile, setIsMobile] = useState(false);
const [user, setUser] = useState(null);
const router = useRouter();

// Detect if the window is mobile-sized
useEffect(() => {
const handleResize = () => {
setIsMobile(window.innerWidth < 768);
};
handleResize();
window.addEventListener('resize', handleResize);
return () => window.removeEventListener('resize', handleResize);
}, []);

// Monitor auth state and redirect if already signed in
useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
if (currentUser) {
setUser(currentUser);
router.push('/home'); // Redirect to home if user is already logged in
} else {
setUser(null);
}
});
return () => unsubscribe();
}, [router]);

const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    
    try {
       // Essayer d'utiliser signInWithPopup d'abord
       const result = await signInWithPopup(auth, provider);
       console.log('User signed in:', result.user);
       setUser(result.user);
       router.push('/home'); // Rediriger vers la page d'accueil après la connexion
    } catch (error) {
       console.error('Popup failed, trying redirect:', error.message);
       // Si signInWithPopup échoue, essayer avec signInWithRedirect
       try {
          await signInWithRedirect(auth, provider);
          // Redirection vers la page d'accueil après la connexion (effectuée après la redirection)
          setUser(auth.currentUser);
          router.push('/home');
       } catch (redirectError) {
          console.error('Error during sign in with redirect:', redirectError.message);
       }
    }
 };
 

const handleGetStarted = () => {
if (user) {
router.push('/home'); // Redirect to home page if already signed in
} else {
handleGoogleSignIn(); // Trigger Google sign-in if not signed in
}
};

const shinyBronze = '#D2A76A';
const shinyBronzeHover = '#E0B77D';

const baseStyles = {
fontFamily: 'Arial, sans-serif',
color: '#e0e0e0',
lineHeight: '1.6',
backgroundColor: '#121212',
minHeight: '100vh',
};

const headerStyles = {
background: '#1e1e1e',
color: '#e0e0e0',
padding: '1rem 0',
boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
};

const headerContentStyles = {
display: 'flex',
alignItems: 'center',
justifyContent: 'space-between',
maxWidth: '1200px',
margin: '0 auto',
padding: '0 1rem',
};

const buttonStyles = {
backgroundColor: shinyBronze,
color: '#121212',
border: 'none',
padding: isMobile ? '10px 20px' : '12px 24px',
fontSize: isMobile ? '0.9rem' : '1rem',
borderRadius: '4px',
cursor: 'pointer',
transition: 'background-color 0.3s',
};

const logo = {
display: 'flex',
alignItems: 'center',
justifyContent: 'space-around',
maxWidth: '1200px',
margin: '0px',
padding: '0px',
};

const featureSectionStyles = {
padding: '2rem 0',
backgroundColor: '',
};

const featureGridStyles = {
display: 'grid',
gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
gap: '2rem',
maxWidth: '1200px',
margin: '0 auto',
};

const featureItemStyles = {
textAlign: 'center',
padding: '1rem',
borderRadius: '8px',
backgroundColor: '#2a2a2a',
boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

return (
<div style={baseStyles}>
<Head>
<title>PostPen</title>Ai text on image generator.
<meta name="description" content="" />
<meta property="og:title" content="PostPen" />
<meta property="og:description" content="" />
<meta property="og:image" content="https://i.postimg.cc/W2923hTN/Capture-d-cran-1023.png" />
<meta property="og:url" content="https://post-pen.vercel.app/" />
<meta property="og:type" content="website" />
</Head>

<header style={headerStyles}>
<div style={headerContentStyles}>
<div style={logo}>
    <img
        src="/larg.png"
        alt="PostPen App Interface"
        style={{
            maxWidth: '40px',
            height: '40px',
            marginRight: '5px',
            boxShadow: '0 4px 8px rgba(255,255,255,0.1)',
            borderRadius: '100%',
        }}
    />
    <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', margin: 0, color: shinyBronze }}>
        PostPen
    </h1>
</div>
<nav>
    <button onClick={handleGoogleSignIn} style={buttonStyles}>
        {user ? 'Sign out' : 'Sign in with Google'}
    </button>
</nav>
</div>
</header>

<main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
<section
style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
}}
>
<div
    style={{
        flex: '1',
        minWidth: isMobile ? '70%' : '300px',
        marginRight: isMobile ? '0' : '2rem',
        marginBottom: isMobile ? '1rem' : '0',
    }}
>
    <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '1rem', color: shinyBronze }}>
       🌟Let's make your post  more engaging!🚀
    </h2>
    <p style={{ marginBottom: '1.5rem', fontSize: isMobile ? '1rem' : '1.1rem', color: '#e0e0e0' }}>
    <strong>PostPen</strong> boosts your <em>social media views</em> by using <strong>AI</strong> to generate punchlines, advice, and jokes on images, making your posts more engaging and shareable
    </p>
    <button
        style={buttonStyles}
        onMouseOver={(e) => (e.target.style.backgroundColor = shinyBronzeHover)}
        onMouseOut={(e) => (e.target.style.backgroundColor = shinyBronze)}
        onClick={handleGetStarted}
    >
        Get Started Now
    </button>
</div>
<div style={{ flex: '1', minWidth: isMobile ? '70%' : '300px' }}>
    <img
        src="/p.jpg"
        alt="PostPen"
        style={{
            maxWidth: '80%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(255,255,255,0.1)',
        }}
    />
</div>
</section>

<section style={featureSectionStyles}>
<h2
    style={{
        fontSize: isMobile ? '1.8rem' : '2rem',
        textAlign: 'center',
        marginBottom: '2rem',
        color: shinyBronze,
    }}
>
    Features that Empower You
</h2>
<div style={featureGridStyles}>
    {[
        { title: 'AI Text Generation', icon: '🤖✍️', description: 'Empower your message with the magic of AI!' },
        { title: 'Color Control', icon: '🎨', description: 'Choose perfect background and text colors' },
        { title: 'Image Overlay : COMING SOON', icon: '🖼️', description: 'Upload and overlay your own images' },
    ].map((feature, index) => (
        <div key={index} style={featureItemStyles}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">
                {feature.icon}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: shinyBronze }}>
                {feature.title}
            </h3>
            <p style={{ color: '#e0e0e0' }}>{feature.description}</p>
        </div>
    ))}
</div>
</section>
</main>
</div>
);
}
