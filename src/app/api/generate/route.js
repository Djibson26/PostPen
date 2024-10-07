import { createCanvas, loadImage } from 'canvas';

export async function POST(req) {
    const { text, backgroundColor, fontColor, fontSize, fontFamily, overlayImage } = await req.json();

    // Set the canvas size (Instagram post dimensions)
    const width = 1080; // Instagram recommended size
    const height = 1080; // Instagram recommended size
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill the canvas with the selected background color
    ctx.fillStyle = backgroundColor || 'black'; // Default to black if not provided
    ctx.fillRect(0, 0, width, height);

    // Load and draw the overlay image if provided
    if (overlayImage) {
        const img = await loadImage(overlayImage);
        
        // Scale the overlay image down to fit nicely
        const maxOverlaySize = 200; // Maximum size for the overlay image (adjust as needed)
        const overlaySize = Math.min(img.width, img.height, maxOverlaySize);

        // Position the overlay image at the center above the text
        const overlayX = (width - overlaySize) / 2; // Center horizontally
        const overlayY = (height / 2) - overlaySize; // Above the text

        // Create a circular clipping path
        ctx.save(); // Save the current state
        ctx.beginPath();
        ctx.arc(overlayX + overlaySize / 2, overlayY + overlaySize / 2, overlaySize / 2, 0, Math.PI * 2); // Create a circle
        ctx.clip(); // Set clipping region to the circle

        // Draw the scaled image in the circular area
        ctx.drawImage(img, overlayX, overlayY, overlaySize, overlaySize); // Draw as a square with scaled size
        ctx.restore(); // Restore to the previous state
    }

    // Set text properties
    ctx.fillStyle = fontColor || 'white'; // Default to white if not provided
    ctx.font = `${fontSize || 40}px ${fontFamily || 'Arial'}`; // Default to Arial if not provided
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the text on the canvas, below the overlay image
    ctx.fillText(text, width / 2, height / 2 + 30); // Position text below the overlay image

    // Send the image as a PNG
    const buffer = canvas.toBuffer('image/png');
    return new Response(buffer, {
        headers: {
            'Content-Type': 'image/png',
        },
    });
}
