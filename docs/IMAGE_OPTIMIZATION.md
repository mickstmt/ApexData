# Image Optimization Guide

This guide explains how to use the image optimization features in ApexData.

## Overview

ApexData uses Next.js Image optimization to automatically optimize images for better performance. All images are lazy-loaded, automatically sized, and served in modern formats.

## Components

### OptimizedImage

The base component for optimized images with loading states and error handling.

```tsx
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false} // Set to true for above-the-fold images
/>
```

**Props:**
- `src` - Image source URL (local or remote)
- `alt` - Alternative text for accessibility
- `width` - Image width in pixels
- `height` - Image height in pixels
- `className` - Additional CSS classes
- `priority` - Load image immediately (for LCP images)
- `fill` - Make image fill parent container
- `sizes` - Responsive sizes attribute
- `objectFit` - How image should fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

**Features:**
- Automatic skeleton loading state
- Error state with fallback UI
- Smooth fade-in transition
- Optimized performance

### DriverAvatar

Specialized component for driver profile pictures with initials fallback.

```tsx
import { DriverAvatar } from '@/components/ui/OptimizedImage';

<DriverAvatar
  src={driver.imageUrl}
  name={`${driver.givenName} ${driver.familyName}`}
  size="lg"
/>
```

**Props:**
- `src` - Optional image URL
- `name` - Driver's full name (used for initials if no image)
- `size` - 'sm' | 'md' | 'lg' | 'xl'

**Sizes:**
- `sm` - 48x48px (h-12 w-12)
- `md` - 64x64px (h-16 w-16)
- `lg` - 96x96px (h-24 w-24)
- `xl` - 192x192px (h-48 w-48)

### TeamLogo

Specialized component for constructor/team logos with abbreviation fallback.

```tsx
import { TeamLogo } from '@/components/ui/OptimizedImage';

<TeamLogo
  src={constructor.logoUrl}
  name={constructor.name}
  size="md"
/>
```

**Props:**
- `src` - Optional logo URL
- `name` - Team name (used for abbreviation if no logo)
- `size` - 'sm' | 'md' | 'lg'

**Sizes:**
- `sm` - 32x32px (h-8 w-8)
- `md` - 48x48px (h-12 w-12)
- `lg` - 64x64px (h-16 w-16)

## Remote Images

The app is configured to accept images from any HTTPS source. To restrict this for security:

```ts
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'specific-domain.com',
    },
  ],
}
```

## Best Practices

### 1. Use priority for LCP images

```tsx
// Hero image or first image above the fold
<OptimizedImage
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority={true}
/>
```

### 2. Specify sizes for responsive images

```tsx
<OptimizedImage
  src="/image.jpg"
  alt="Responsive image"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 3. Use fill for dynamic containers

```tsx
<div className="relative h-64 w-full">
  <OptimizedImage
    src="/image.jpg"
    alt="Fill image"
    fill
    objectFit="cover"
  />
</div>
```

### 4. Leverage placeholders

All components automatically show skeleton loaders while images load. No additional configuration needed!

## Adding Images to Database

To add image URLs to the database schema:

```prisma
model Driver {
  // ... existing fields
  imageUrl  String?  @map("image_url")
}

model Constructor {
  // ... existing fields
  logoUrl   String?  @map("logo_url")
}
```

Then update your components:

```tsx
<DriverAvatar
  src={driver.imageUrl}
  name={`${driver.givenName} ${driver.familyName}`}
  size="lg"
/>
```

## Image Sources

Potential sources for F1 images:
- Official F1 media API (when available)
- Jolpica F1 API (check if they provide image URLs)
- OpenF1 API (may include driver/team images)
- Wikipedia/Wikimedia Commons
- Custom uploaded images

## Performance Metrics

Next.js Image automatically:
- Serves images in WebP/AVIF when supported
- Generates multiple sizes for responsive loading
- Lazy loads images below the fold
- Prevents Cumulative Layout Shift (CLS)
- Optimizes for Core Web Vitals
