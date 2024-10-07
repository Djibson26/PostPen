'use client';

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

    // Monitor auth state and set the user when signed in
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Handle Google sign-in or sign-out
    const handleGoogleSignIn = async () => {
        if (user) {
            // If the user is already signed in, handle sign out
            try {
                await signOut(auth);
                console.log("User signed out");
                setUser(null); // Reset the user state
            } catch (error) {
                console.error("Error during sign out:", error.message);
            }
        } else {
            // If the user is not signed in, handle sign in
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                console.log("User signed in:", result.user);
                setUser(result.user); // Set user after sign-in
            } catch (error) {
                console.error("Error during Google sign-in:", error.message);
            }
        }
    };

    // Redirect to home page if the user is signed in
    const handleGetStarted = () => {
        if (user) {
            router.push('/home'); // Redirect to the home page
        } else {
            alert('Please sign in to get started.');
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

    const mainStyles = {
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto',
    };

    const heroSectionStyles = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
    };

    const heroContentStyles = {
        flex: '1',
        minWidth: isMobile ? '100%' : '300px',
        marginRight: isMobile ? '0' : '2rem',
        marginBottom: isMobile ? '1rem' : '0',
    };

    const heroImageStyles = {
        flex: '1',
        minWidth: isMobile ? '100%' : '300px',
    };

    const featureSectionStyles = {
        marginBottom: '2rem',
    };

    const featureGridStyles = {
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
    };

    const featureItemStyles = {
        flex: '1',
        minWidth: isMobile ? '100%' : '200px',
        maxWidth: '250px',
        margin: '1rem',
        padding: '1.5rem',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(255,255,255,0.1)',
        textAlign: 'center',
    };

    const pricingSectionStyles = {
        marginBottom: '2rem',
    };

    const pricingGridStyles = {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
    };

    const pricingItemStyles = {
        width: isMobile ? '100%' : '300px',
        padding: '1.5rem',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(255,255,255,0.1)',
        textAlign: 'center',
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
        padding:'0px',
       
    };

    return (
        <div style={baseStyles}>
            <header style={headerStyles}>
                <div style={headerContentStyles}> 
                     <div style={logo}><img src="/larg.png" alt="PostPen App Interface" style={{
                            maxWidth: '40px',
                            height: '40px',
                            marginRight: '5px',
                            boxShadow: '0 4px 8px rgba(255,255,255,0.1)',
                            borderRadius: '100%',
                            right:0,
                        }} />
                        
                        <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', margin: 0,  color: shinyBronze }}>PostPen</h1>
                        </div>
                    <nav>
                        <button onClick={handleGoogleSignIn} style={buttonStyles}>
                            {user ? 'Sign out' : 'Sign in with Google'}
                        </button>
                    </nav>
                </div>
            </header>

            <main style={mainStyles}>
                <section style={heroSectionStyles}>
                    <div style={heroContentStyles}>
                        <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '1rem', color: shinyBronze }}>
                            Transform Your Ideas into Visuals
                        </h2>
                        <p style={{ marginBottom: '1.5rem', fontSize: isMobile ? '1rem' : '1.1rem', color: '#e0e0e0' }}>
                            ImagePost empowers you to create eye-catching images for social media, presentations, or any digital content. No design skills required!
                        </p>
                        <button
                            style={buttonStyles}
                            onMouseOver={(e) => e.target.style.backgroundColor = shinyBronzeHover}
                            onMouseOut={(e) => e.target.style.backgroundColor = shinyBronze}
                            onClick={handleGetStarted}
                        >
                            Get Started Now
                        </button>
                    </div>
                    <div style={heroImageStyles}>
                        <img src="/placeholder.png" alt="ImagePost App Interface" style={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            boxShadow: '0 4px 8px rgba(255,255,255,0.1)',
                        }} />
                    </div>
                </section>

                <section style={featureSectionStyles}>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', textAlign: 'center', marginBottom: '2rem', color: shinyBronze }}>Features that Empower You</h2>
                    <div style={featureGridStyles}>
                        {[{ title: 'Custom Text', icon: '✍️', description: 'Add your message with various fonts and sizes' },
                        { title: 'Color Control', icon: '🎨', description: 'Choose perfect background and text colors' },
                        { title: 'Image Overlay', icon: '🖼️', description: 'Upload and overlay your own images' },
                        { title: 'One-Click Share', icon: '🚀', description: 'Share directly to social media platforms' },
                        ].map((feature, index) => (
                            <div key={index} style={featureItemStyles}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">{feature.icon}</div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: shinyBronze }}>{feature.title}</h3>
                                <p style={{ color: '#e0e0e0' }}>{feature.description}</p>
                            </div>
                        ))} 
                    </div>
                </section>

                <section style={pricingSectionStyles}>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', textAlign: 'center', marginBottom: '2rem', color: shinyBronze }}>Affordable Pricing Plans</h2>
                    <div style={pricingGridStyles}>
                        {[{ name: 'Starter', price: '$5/month', features: ['5 image generations', 'Basic customization'] },
                        { name: 'Pro', price: '$15/month', features: ['Unlimited generations', 'Advanced customization', 'Priority support'] }
                        ].map((plan, index) => (
                            <div key={index} style={pricingItemStyles}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: shinyBronze }}>{plan.name}</h3>
                                <p style={{ fontSize: '1.2rem', color: '#e0e0e0' }}>{plan.price}</p>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {plan.features.map((feature, i) => (
                                        <li key={i} style={{ color: '#e0e0e0', marginBottom: '0.5rem' }}>{feature}</li>
                                    ))}
                                </ul>
                                <button
                                    style={buttonStyles}
                                    onMouseOver={(e) => e.target.style.backgroundColor = shinyBronzeHover}
                                    onMouseOut={(e) => e.target.style.backgroundColor = shinyBronze}
                                >
                                    Choose {plan.name}
                                </button>
                            </div>
                        ))} 
                    </div>
                </section>
            </main>
        </div>
    );
}
