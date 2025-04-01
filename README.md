# Vimeo Lightbox

A lightweight JavaScript solution that transforms Vimeo videos into responsive background elements with optional lightbox functionality.

## Features

- **Responsive Background Videos** - Videos automatically scale to fill any container
- **Lightbox Mode** - Click to expand videos into an immersive lightbox player
- **Custom Controls** - Elegant video controls with play/pause, timeline, volume, and fullscreen
- **Color Customization** - Set custom accent colors for controls via data attributes
- **Performance Optimized** - Videos pause when not in viewport to save resources
- **Zero Dependencies** - No jQuery or other libraries required
- **Mobile-Friendly** - Touch-enabled controls work across all devices

## Installation

```bash
npm install vimeo-lightbox
```

Or include directly:

```html
<script src="custom-video-element.min.js"></script>
```

## Quick Start

Add this HTML structure to your page:

```html
<div class="custom-video-container" data-lightbox="on" data-color="00bcd4" data-thumbnail="path/to/thumbnail.jpg">
    <div class="embed-wrapper">
        <iframe src="https://player.vimeo.com/video/YOUR_VIDEO_ID?background=1&autoplay=1&loop=1&byline=0&title=0"
            frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
    </div>
</div>
```

## Options

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-lightbox` | "on" / "off" | "off" | Enable or disable lightbox functionality |
| `data-color` | Hex color (without #) | "00bcd4" | Set custom color for lightbox controls |
| `data-thumbnail` | URL | none | Optional thumbnail image shown before video loads |

## Examples

### Background Video Only

```html
<div class="custom-video-container" data-lightbox="off">
    <div class="embed-wrapper">
        <iframe src="https://player.vimeo.com/video/YOUR_VIDEO_ID?background=1&autoplay=1&loop=1&byline=0&title=0"
            frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
    </div>
</div>
```

### Background Video with Lightbox

```html
<div class="custom-video-container" data-lightbox="on" data-color="ff5722">
    <div class="embed-wrapper">
        <iframe src="https://player.vimeo.com/video/YOUR_VIDEO_ID?background=1&autoplay=1&loop=1&byline=0&title=0"
            frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
    </div>
</div>
```

## License

MIT License

## Created By

Ravi Klaassens at [Paramor©](https://paramor.nl/) 