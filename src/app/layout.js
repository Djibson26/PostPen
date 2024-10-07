// app/layout.js

export const metadata = {
  title: 'ImagePost', // Adjust this as necessary
  description: 'Your image generation SaaS',
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
