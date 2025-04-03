/**
 * Custom Video Element
 * Makes video backgrounds responsive with optional lightbox player functionality
 * Compatible with Vimeo and potentially other video platforms
 * 
 * @license MIT
 * @version 1.0.2
 */
(function() {
  // Configuration object - makes the module more configurable
  const config = {
    containerClass: 'custom-video-container',
    wrapperClass: 'embed-wrapper',
    triggerClass: 'video-trigger',
    lightboxClass: 'video-lightbox',
    playerClass: 'video-player',
    controlsClass: 'video-controls',
    lightboxAttribute: 'data-lightbox',
    colorAttribute: 'data-color',
    defaultColor: '00bcd4',
    aspectRatio: 16/9,
    safetyMargin: 1.2,
    // Visibility threshold for IntersectionObserver - 0.1 means 10% visible
    visibilityThreshold: 0.1
  };

  // Store video players to manage their play/pause state
  const videoPlayers = new Map();

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Run whenever window is resized
  window.addEventListener('resize', setupBackgroundVideos);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', cleanupVideoResources);

  function init() {
    setupBackgroundVideos();
  }
  
  // Clean up video players and observers
  function cleanupVideoResources() {
    // Disconnect all observers
    document.querySelectorAll(`.${config.containerClass}`).forEach(container => {
      if (container.visibilityObserver) {
        container.visibilityObserver.disconnect();
      }
    });
    
    // Cleanup all video players
    videoPlayers.forEach((player, id) => {
      try {
        player.unload();
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    
    // Clear the players map
    videoPlayers.clear();
  }

  // Setup responsive background videos
  function setupBackgroundVideos() {
    // Get the elements
    const videoContainers = document.querySelectorAll(`.${config.containerClass}`);
    if (!videoContainers.length) return;
    
    videoContainers.forEach(container => {
      const embedWrapper = container.querySelector(`.${config.wrapperClass}`);
      if (!embedWrapper) return;
      
      let iframe = container.querySelector('iframe');
      
      // Check if there's a data-id attribute to create the iframe dynamically
      const videoId = container.getAttribute('data-id');
      
      if (!iframe && videoId) {
        // Create iframe if it doesn't exist but we have a video ID
        iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${videoId}?background=1&autoplay=1&loop=1&byline=0&title=0`;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        embedWrapper.appendChild(iframe);
      } else if (!iframe) {
        return;
      }
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate dimensions based on viewport
      let width, height;
      
      // Always ensure height is fully covered
      height = viewportHeight;
      
      // Calculate width based on aspect ratio
      width = height * config.aspectRatio;
      
      // If width is not enough to cover viewport width, increase it
      if (width < viewportWidth) {
        width = viewportWidth;
        height = width / config.aspectRatio;
      }
      
      // Add safety margin
      width *= config.safetyMargin;
      height *= config.safetyMargin;
      
      // Apply styles to the main container
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'visible';
      container.style.zIndex = '0';
      
      // Style the embed container to be full-sized
      embedWrapper.style.position = 'absolute';
      embedWrapper.style.top = '0';
      embedWrapper.style.left = '0';
      embedWrapper.style.width = '100%';
      embedWrapper.style.height = '100%';
      embedWrapper.style.overflow = 'visible';
      
      // Apply specific dimensions and positioning to the iframe
      iframe.style.position = 'absolute';
      iframe.style.width = width + 'px';
      iframe.style.height = height + 'px';
      iframe.style.top = '50%';
      iframe.style.left = '50%';
      iframe.style.transform = 'translate(-50%, -50%)';
      iframe.style.border = 'none';
      iframe.style.pointerEvents = 'none'; // Prevent iframe from catching clicks
      
      // Force the iframe to be visible
      iframe.style.display = 'block';
      iframe.style.opacity = '1';
      iframe.style.visibility = 'visible';
      
      // Add lightbox button if data-lightbox attribute is "on"
      if (container.getAttribute(config.lightboxAttribute) === 'on') {
        // Add play button if it doesn't exist
        if (!container.querySelector(`.${config.triggerClass}`)) {
          addVideoTrigger(container);
        }
        
        // No need for container click handler since trigger now covers entire area
        // Remove any existing click handler if it exists
        if (container.containerClickHandler) {
          container.removeEventListener('click', container.containerClickHandler);
          delete container.containerClickHandler;
        }
      }
      
      // Initialize video player for visibility tracking if not already initialized
      if (!container.hasAttribute('data-visibility-tracked')) {
        initializeVisibilityTracking(container);
      }
    });
  }
  
  // Initialize Intersection Observer to track video visibility
  function initializeVisibilityTracking(container) {
    // Mark container as being tracked
    container.setAttribute('data-visibility-tracked', 'true');
    
    // Create Intersection Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Get iframe and container ID
        const iframe = entry.target.querySelector('iframe');
        if (!iframe) return;
        
        // Use container ID as key or generate one if it doesn't exist
        if (!entry.target.id) {
          entry.target.id = `container-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        const containerId = entry.target.id;
        
        // Check if this is the first time we're observing this container
        if (!videoPlayers.has(containerId)) {
          // Initialize player when first observed
          waitForVimeoApi().then(() => {
            const player = new Vimeo.Player(iframe);
            videoPlayers.set(containerId, player);
            
            // Decide whether to play or pause based on current visibility
            if (entry.isIntersecting) {
              player.play().catch(err => {
                console.warn('Could not play video:', err);
              });
            } else {
              player.pause().catch(err => {
                console.warn('Could not pause video:', err);
              });
            }
          });
        } else {
          // Get existing player
          const player = videoPlayers.get(containerId);
          
          // Play when visible, pause when not visible
          if (entry.isIntersecting) {
            player.play().catch(err => {
              console.warn('Could not play video:', err);
            });
          } else {
            player.pause().catch(err => {
              console.warn('Could not pause video:', err);
            });
          }
        }
      });
    }, {
      threshold: config.visibilityThreshold,
      rootMargin: '0px'
    });
    
    // Start observing the container
    observer.observe(container);
    
    // Store observer reference on container to disconnect later if needed
    container.visibilityObserver = observer;
  }
  
  // Extract Vimeo ID from src URL
  function getVimeoIdFromSrc(src) {
    const match = src.match(/video\/(\d+)/);
    return match ? match[1] : null;
  }
  
  // Get Vimeo ID for a container
  function getVimeoIdForContainer(container) {
    // First check for data-id attribute
    const dataId = container.getAttribute('data-id');
    if (dataId) {
      return dataId;
    }
    
    // Fallback to extracting from iframe src
    const iframe = container.querySelector('iframe');
    if (iframe) {
      return getVimeoIdFromSrc(iframe.src);
    }
    
    return null;
  }
  
  // Add video trigger button to container
  function addVideoTrigger(container) {
    const videoTrigger = document.createElement('button');
    videoTrigger.className = config.triggerClass;
    videoTrigger.setAttribute('aria-label', 'Open video in fullscreen');
    
    // Get color from data attribute or use default
    const color = container.getAttribute(config.colorAttribute) || config.defaultColor;
    
    // Create play icon element
    const playIcon = document.createElement('div');
    playIcon.className = 'play-icon';
    playIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    `;
    
    // Style the play icon - position in bottom right
    playIcon.style.position = 'absolute';
    playIcon.style.bottom = '20px';
    playIcon.style.right = '20px';
    playIcon.style.transition = 'opacity 0.3s ease, transform 0.2s ease';
    playIcon.style.pointerEvents = 'none'; // Let events pass to parent button
    playIcon.style.opacity = '0'; // Hide by default, show on hover
    
    // Make video trigger cover the entire container
    videoTrigger.style.position = 'absolute';
    videoTrigger.style.top = '0';
    videoTrigger.style.left = '0';
    videoTrigger.style.width = '100%';
    videoTrigger.style.height = '100%';
    videoTrigger.style.background = 'transparent';
    videoTrigger.style.border = 'none';
    videoTrigger.style.margin = '0';
    videoTrigger.style.padding = '0';
    videoTrigger.style.cursor = 'pointer';
    videoTrigger.style.zIndex = '10';
    videoTrigger.style.display = 'block';
    videoTrigger.style.pointerEvents = 'auto';
    
    // Add hover effects to show play icon
    videoTrigger.addEventListener('mouseenter', () => {
      playIcon.style.opacity = '1';
      playIcon.style.transform = 'scale(1.1)';
    });
    
    videoTrigger.addEventListener('mouseleave', () => {
      playIcon.style.opacity = '0';
      playIcon.style.transform = 'scale(1)';
    });
    
    // Click handler - open lightbox
    videoTrigger.addEventListener('click', (e) => {
      // Prevent event propagation to ensure the click isn't ignored
      e.stopPropagation();
      
      const videoId = getVimeoIdForContainer(container);
      if (videoId) {
        openLightbox(videoId, container);
      }
    });
    
    // Append play icon to the trigger button
    videoTrigger.appendChild(playIcon);
    container.appendChild(videoTrigger);
  }
  
  // Create and open lightbox
  function openLightbox(videoId, container) {
    // If no videoId was provided, try to get it from the container
    if (!videoId) {
      videoId = getVimeoIdForContainer(container);
      if (!videoId) {
        console.error('No video ID found for lightbox');
        return;
      }
    }
    
    // Pause the background video first if available
    const containerId = container.id;
    if (containerId && videoPlayers.has(containerId)) {
      const player = videoPlayers.get(containerId);
      player.pause().catch(err => {
        console.warn('Could not pause background video:', err);
      });
    }
    
    // Create lightbox container
    const lightbox = document.createElement('div');
    lightbox.className = config.lightboxClass;
    lightbox.setAttribute('id', `lightbox-${Date.now()}`);
    
    // Store reference to the original container for resuming background video later
    lightbox.setAttribute('data-source-container', container.id || `container-${Date.now()}`);
    if (!container.id) {
      container.id = lightbox.getAttribute('data-source-container');
    }
    
    // Get color from data attribute or use default
    const color = container.getAttribute(config.colorAttribute) || config.defaultColor;
    
    // Style the lightbox
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.width = '100%';
    lightbox.style.height = '100%';
    lightbox.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    lightbox.style.zIndex = '9999';
    lightbox.style.display = 'flex';
    lightbox.style.justifyContent = 'center';
    lightbox.style.alignItems = 'center';
    
    // Create player container
    const playerContainer = document.createElement('div');
    playerContainer.className = config.playerClass;
    playerContainer.setAttribute('data-initialized', 'false');
    playerContainer.setAttribute('data-playing', 'false');
    playerContainer.setAttribute('data-muted', 'false');
    playerContainer.setAttribute('data-fullscreen', 'false');
    
    // Style player container
    playerContainer.style.position = 'relative';
    playerContainer.style.width = '80%';
    playerContainer.style.maxWidth = '1200px';
    playerContainer.style.backgroundColor = '#000';
    
    // Create aspect ratio container
    const aspectRatioContainer = document.createElement('div');
    aspectRatioContainer.className = 'aspect-ratio-container';
    aspectRatioContainer.style.position = 'relative';
    aspectRatioContainer.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
    
    // Create iframe
    const iframe = document.createElement('iframe');
    // Important: Use parameters to hide Vimeo controls
    iframe.src = `https://player.vimeo.com/video/${videoId}?api=1&background=0&autoplay=0&loop=0&muted=0&controls=0&transparent=0`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    // Create controls
    const controls = document.createElement('div');
    controls.className = config.controlsClass;
    controls.style.position = 'absolute';
    controls.style.bottom = '0';
    controls.style.left = '0';
    controls.style.width = '100%';
    controls.style.padding = '15px';
    controls.style.background = 'linear-gradient(transparent, rgba(0,0,0,0.7))';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.transition = 'opacity 0.3s ease';
    
    // Create control buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.marginRight = '15px';
    
    // Create play/pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.setAttribute('data-control', 'play');
    playPauseBtn.setAttribute('aria-label', 'Play');
    playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    playPauseBtn.style.background = 'none';
    playPauseBtn.style.border = 'none';
    playPauseBtn.style.color = `#${color}`;
    playPauseBtn.style.cursor = 'pointer';
    playPauseBtn.style.marginRight = '15px';
    playPauseBtn.style.padding = '5px';
    
    // Create timeline/progress container
    const timelineContainer = document.createElement('div');
    timelineContainer.style.flex = '1';
    timelineContainer.style.position = 'relative';
    
    // Create progress element
    const progress = document.createElement('progress');
    progress.setAttribute('max', '100');
    progress.setAttribute('value', '0');
    progress.style.width = '100%';
    progress.style.height = '5px';
    progress.style.position = 'absolute';
    progress.style.top = '50%';
    progress.style.transform = 'translateY(-50%)';
    progress.style.borderRadius = '3px';
    progress.style.overflow = 'hidden';
    progress.style.appearance = 'none';
    progress.style.backgroundColor = '#444';
    
    // Create timeline/scrubber
    const timeline = document.createElement('input');
    timeline.type = 'range';
    timeline.setAttribute('data-control', 'timeline');
    timeline.setAttribute('min', '0');
    timeline.setAttribute('max', '100');
    timeline.setAttribute('value', '0');
    timeline.setAttribute('step', '0.1');
    timeline.style.width = '100%';
    timeline.style.height = '15px';
    timeline.style.margin = '0';
    timeline.style.position = 'relative';
    timeline.style.appearance = 'none';
    timeline.style.backgroundColor = 'transparent';
    timeline.style.cursor = 'pointer';
    timeline.style.zIndex = '2';
    
    // Create control buttons on the right side
    const rightButtonsContainer = document.createElement('div');
    rightButtonsContainer.style.display = 'flex';
    rightButtonsContainer.style.alignItems = 'center';
    rightButtonsContainer.style.marginLeft = '10px';
    
    // Create mute button
    const muteBtn = document.createElement('button');
    muteBtn.setAttribute('data-control', 'mute');
    muteBtn.setAttribute('aria-label', 'Mute');
    muteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    muteBtn.style.background = 'none';
    muteBtn.style.border = 'none';
    muteBtn.style.color = `#${color}`;
    muteBtn.style.cursor = 'pointer';
    muteBtn.style.marginRight = '15px';
    muteBtn.style.padding = '5px';
    
    // Create fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.setAttribute('data-control', 'fullscreen');
    fullscreenBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fullscreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
    fullscreenBtn.style.background = 'none';
    fullscreenBtn.style.border = 'none';
    fullscreenBtn.style.color = `#${color}`;
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.style.padding = '5px';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10';
    closeBtn.style.padding = '5px';
    
    // Add style element for custom progress bar
    const style = document.createElement('style');
    style.textContent = `
      .${config.controlsClass} progress::-webkit-progress-bar {
        background-color: #444;
        border-radius: 3px;
      }
      
      .${config.controlsClass} progress::-webkit-progress-value {
        background-color: #${color};
        border-radius: 3px;
      }
      
      .${config.controlsClass} progress::-moz-progress-bar {
        background-color: #${color};
        border-radius: 3px;
      }
      
      .${config.lightboxClass} button[data-control] {
        opacity: 0.8;
        transition: opacity 0.2s ease;
      }
      
      .${config.lightboxClass} button[data-control]:hover {
        opacity: 1;
      }
      
      /* Range input (timeline) styling */
      .${config.controlsClass} input[type="range"] {
        -webkit-appearance: none;
        background: transparent;
        position: relative;
        z-index: 5;
      }
      
      .${config.controlsClass} input[type="range"]:focus {
        outline: none;
      }
      
      .${config.controlsClass} input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        background: transparent;
        border-radius: 3px;
      }
      
      .${config.controlsClass} input[type="range"]::-moz-range-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        background: transparent;
        border-radius: 3px;
      }
      
      .${config.controlsClass} input[type="range"]::-ms-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        background: transparent;
        border-radius: 3px;
        border: none;
        color: transparent;
      }
      
      .${config.controlsClass} input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #${color};
        cursor: pointer;
        border: none;
        margin-top: -3.5px;
      }
      
      .${config.controlsClass} input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #${color};
        cursor: pointer;
        border: none;
      }
      
      .${config.controlsClass} input[type="range"]::-ms-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #${color};
        cursor: pointer;
        border: none;
      }
      
      /* Mobile styles */
      @media (max-width: 768px) {
        .${config.playerClass} {
          width: 95% !important;
        }
        
        .${config.controlsClass} {
          padding: 10px !important;
        }
        
        .${config.controlsClass} button {
          padding: 3px !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Append all elements
    timelineContainer.appendChild(progress);
    timelineContainer.appendChild(timeline);
    
    buttonsContainer.appendChild(playPauseBtn);
    
    rightButtonsContainer.appendChild(muteBtn);
    rightButtonsContainer.appendChild(fullscreenBtn);
    
    controls.appendChild(buttonsContainer);
    controls.appendChild(timelineContainer);
    controls.appendChild(rightButtonsContainer);
    
    aspectRatioContainer.appendChild(iframe);
    aspectRatioContainer.appendChild(controls);
    
    playerContainer.appendChild(aspectRatioContainer);
    
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(playerContainer);
    
    document.body.appendChild(lightbox);
    
    // Wait for Vimeo API to be ready
    waitForVimeoApi().then(() => {
      // Initialize the player
      const player = new Vimeo.Player(iframe);
      
      // Store player and lightbox references
      playerContainer.player = player;
      playerContainer.lightbox = lightbox;
      
      // Player event handling
      setupLightboxControls(playerContainer, color);
    });
    
    // Close lightbox when close button is clicked
    closeBtn.addEventListener('click', () => {
      closeLightbox(lightbox);
    });
    
    // Close lightbox when clicking outside the player
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox(lightbox);
      }
    });
    
    // Handle ESC key to close lightbox
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.body.contains(lightbox)) {
        closeLightbox(lightbox);
        document.removeEventListener('keydown', escHandler);
      }
    });
  }
  
  // Close lightbox and cleanup
  function closeLightbox(lightbox) {
    const playerContainer = lightbox.querySelector(`.${config.playerClass}`);
    if (playerContainer && playerContainer.player) {
      playerContainer.player.unload();
    }
    
    // Handle background videos based on their visibility
    waitForVimeoApi().then(() => {
      const videoContainers = document.querySelectorAll(`.${config.containerClass}`);
      videoContainers.forEach(container => {
        const iframe = container.querySelector('iframe');
        if (!iframe) return;
        
        // Get container ID
        const containerId = container.id;
        if (!containerId) return;
        
        // If we have this player in our map
        if (videoPlayers.has(containerId)) {
          const player = videoPlayers.get(containerId);
          
          // Check if container is currently visible
          const containerRect = container.getBoundingClientRect();
          const isVisible = (
            containerRect.top < window.innerHeight &&
            containerRect.bottom > 0 &&
            containerRect.left < window.innerWidth &&
            containerRect.right > 0
          );
          
          // Only play if it's visible
          if (isVisible) {
            player.play().catch(err => {
              console.warn('Could not resume background video:', err);
            });
          }
        }
      });
    });
    
    // Animate out
    lightbox.style.opacity = '0';
    
    // Remove after animation
    setTimeout(() => {
      if (document.body.contains(lightbox)) {
        document.body.removeChild(lightbox);
      }
    }, 300);
  }
  
  // Setup lightbox player controls
  function setupLightboxControls(playerContainer, color) {
    const player = playerContainer.player;
    const lightbox = playerContainer.lightbox;
    
    if (!player || !lightbox) return;
    
    const playPauseBtn = lightbox.querySelector('[data-control="play"]');
    const muteBtn = lightbox.querySelector('[data-control="mute"]');
    const fullscreenBtn = lightbox.querySelector('[data-control="fullscreen"]');
    const timeline = lightbox.querySelector('[data-control="timeline"]');
    const progress = lightbox.querySelector('progress');
    const controls = lightbox.querySelector(`.${config.controlsClass}`);
    
    // Set initial state
    playerContainer.setAttribute('data-initialized', 'true');
    
    // Handle play button click
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (playerContainer.getAttribute('data-playing') === 'true') {
          player.pause();
          playerContainer.setAttribute('data-playing', 'false');
          playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
          playPauseBtn.setAttribute('aria-label', 'Play');
        } else {
          player.play();
          playerContainer.setAttribute('data-playing', 'true');
          playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
          playPauseBtn.setAttribute('aria-label', 'Pause');
        }
      });
    }
    
    // Handle mute button click
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (playerContainer.getAttribute('data-muted') === 'true') {
          player.setVolume(1);
          playerContainer.setAttribute('data-muted', 'false');
          muteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
          muteBtn.setAttribute('aria-label', 'Mute');
        } else {
          player.setVolume(0);
          playerContainer.setAttribute('data-muted', 'true');
          muteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
          muteBtn.setAttribute('aria-label', 'Unmute');
        }
      });
    }
    
    // Handle fullscreen button click
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const isFullscreen = 
          document.fullscreenElement || 
          document.webkitFullscreenElement || 
          document.mozFullScreenElement || 
          document.msFullscreenElement;
        
        if (isFullscreen) {
          playerContainer.setAttribute('data-fullscreen', 'false');
          (document.exitFullscreen ||
           document.webkitExitFullscreen ||
           document.mozCancelFullScreen ||
           document.msExitFullscreen).call(document);
        } else {
          playerContainer.setAttribute('data-fullscreen', 'true');
          // Request fullscreen on the aspect ratio container to include controls
          const element = playerContainer.querySelector('.aspect-ratio-container');
          (element.requestFullscreen ||
           element.webkitRequestFullscreen ||
           element.mozRequestFullScreen ||
           element.msRequestFullscreen).call(element);
        }
        
        // Ensure controls remain visible in fullscreen
        if (controls) {
          controls.style.opacity = '1';
        }
      });
    }
    
    // Handle timeline/scrubber input
    if (timeline) {
      ['input', 'change'].forEach(event => {
        timeline.addEventListener(event, () => {
          player.getDuration().then(duration => {
            const seekTime = (timeline.value / 100) * duration;
            player.setCurrentTime(seekTime);
            if (progress) {
              progress.value = timeline.value;
            }
          });
        });
      });
    }
    
    // Update timeline on timeupdate
    player.on('timeupdate', data => {
      if (timeline) {
        player.getDuration().then(duration => {
          const percentage = (data.seconds / duration) * 100;
          timeline.value = percentage;
          if (progress) {
            progress.value = percentage;
          }
        });
      }
    });
    
    // Update play/pause button state when video plays
    player.on('play', () => {
      playerContainer.setAttribute('data-playing', 'true');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        playPauseBtn.setAttribute('aria-label', 'Pause');
      }
    });
    
    // Update play/pause button state when video pauses
    player.on('pause', () => {
      playerContainer.setAttribute('data-playing', 'false');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        playPauseBtn.setAttribute('aria-label', 'Play');
      }
    });
    
    // Get video duration once loaded
    player.getDuration().then(duration => {
      if (timeline) {
        timeline.max = 100; // Use percentage
      }
      if (progress) {
        progress.max = 100; // Use percentage
      }
    });
    
    // Add hover effect to show/hide controls
    let hoverTimer;
    lightbox.addEventListener('mousemove', () => {
      if (controls) {
        controls.style.opacity = '1';
      }
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (playerContainer.getAttribute('data-playing') === 'true' && 
            !playerContainer.getAttribute('data-fullscreen') === 'true') {
          if (controls) {
            controls.style.opacity = '0';
          }
        }
      }, 3000);
    });
    
    // Keep controls visible during a touch on mobile
    lightbox.addEventListener('touchstart', () => {
      if (controls) {
        controls.style.opacity = '1';
      }
      clearTimeout(hoverTimer);
    });
    
    // Ensure controls are always visible in fullscreen
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement && controls) {
        controls.style.opacity = '1';
      }
    });
    
    // Start playing video
    player.play();
  }
  
  // Utility function to wait for Vimeo API to load
  function waitForVimeoApi() {
    return new Promise((resolve) => {
      if (window.Vimeo && window.Vimeo.Player) {
        resolve();
      } else {
        // Check if we're already loading the API
        if (document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')) {
          // If the script is already being loaded, wait for it to complete
          const checkInterval = setInterval(() => {
            if (window.Vimeo && window.Vimeo.Player) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          // Set a timeout to avoid infinite waiting
          setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('Timed out waiting for Vimeo API');
            resolve();
          }, 10000); // 10 seconds timeout
        } else {
          // Load Vimeo Player API
          const script = document.createElement('script');
          script.src = 'https://player.vimeo.com/api/player.js';
          script.onload = resolve;
          document.head.appendChild(script);
        }
      }
    });
  }
})(); 