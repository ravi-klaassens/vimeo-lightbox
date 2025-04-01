/**
 * Responsive IFrame
 * Makes iframes responsive by calculating width/height based on the user's viewport
 * Compatible with Vimeo and potentially other iframe providers
 * 
 * Created by Ravi Klaassens at Paramor©, (paramor.nl)
 * @license MIT
 * @version 1.0.0
 */
(function() {
  function setupResponsiveIframe() {
    // Get the elements
    const responsiveContainer = document.querySelector('.responsive-iframe');
    if (!responsiveContainer) return;
    
    const embedContainer = responsiveContainer.querySelector('.embed-container');
    if (!embedContainer) return;
    
    const iframe = responsiveContainer.querySelector('iframe');
    if (!iframe) return;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Set the aspect ratio (16:9)
    const aspectRatio = 16/9;
    
    // Calculate dimensions based on viewport
    let width, height;
    
    // Always ensure height is fully covered
    height = viewportHeight;
    
    // Calculate width based on aspect ratio
    width = height * aspectRatio;
    
    // If width is not enough to cover viewport width, increase it
    if (width < viewportWidth) {
      width = viewportWidth;
      height = width / aspectRatio;
    }
    
    // Add a safety margin (20%)
    width *= 1.2;
    height *= 1.2;
    
    // Apply styles to the main container
    responsiveContainer.style.position = 'absolute';
    responsiveContainer.style.top = '0';
    responsiveContainer.style.left = '0';
    responsiveContainer.style.width = '100%';
    responsiveContainer.style.height = '100%';
    responsiveContainer.style.overflow = 'visible'; // Allow overflow
    responsiveContainer.style.zIndex = '0';
    
    // Style the embed container to be full-sized
    embedContainer.style.position = 'absolute';
    embedContainer.style.top = '0';
    embedContainer.style.left = '0';
    embedContainer.style.width = '100%';
    embedContainer.style.height = '100%';
    embedContainer.style.overflow = 'visible'; // Allow overflow
    
    // Apply specific dimensions and positioning to the iframe
    iframe.style.position = 'absolute';
    iframe.style.width = width + 'px';
    iframe.style.height = height + 'px';
    iframe.style.top = '50%';
    iframe.style.left = '50%';
    iframe.style.transform = 'translate(-50%, -50%)';
    iframe.style.border = 'none';
    
    // Force the iframe to be visible
    iframe.style.display = 'block';
    iframe.style.opacity = '1';
    iframe.style.visibility = 'visible';
    
    // Debug information to console
    console.log(`Responsive iframe set: ${width}x${height} (viewport: ${viewportWidth}x${viewportHeight})`);
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupResponsiveIframe);
  } else {
    setupResponsiveIframe();
  }
  
  // Run whenever window is resized
  window.addEventListener('resize', setupResponsiveIframe);
})(); 