// app/layout.js

export const metadata = {
  title: 'PostPen', // Adjust this as necessary
  description: 'Ai text on image generator.',
  content: 'https://i.postimg.cc/W2923hTN/Capture-d-cran-1023.png',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={bodyStyles}>
        {children} {/* This will render the content of page.js */}
      </body>
    </html>
  );
}

// Adding body styles
const bodyStyles = {
  margin: 0,                   // Remove default margin
  padding: 0,                  // Remove default padding
  height: '100vh',             // Make sure the body takes full viewport height
  backgroundColor: '#121212',  // Match background color from your content
  display: 'flex',             // Flexbox for centering or layout
  flexDirection: 'column',     // Ensure content is stacked vertically
};
