"use client";

import { CldImage, type CldImageProps } from 'next-cloudinary';
import React from 'react';

export interface CloudinaryImageProps extends Omit<CldImageProps, 'src' | 'alt'> {
  /** Cloudinary Public ID or URL key */
  src: string;
  /** Accessibility alt text */
  alt: string;
  /** Common usage preset for quick, consistent styling and transformations */
  variant?: 'photo' | 'logo' | 'appIcon' | 'custom';
}

/**
 * Reusable Cloudinary Image component powered by `next-cloudinary`.
 * Features automatic format selection, automatic quality optimization,
 * and standard preset variants for photos, logos, and app icons.
 */
export function CloudinaryImage({
  src,
  alt,
  width = 500,
  height = 500,
  variant = 'custom',
  crop = { type: 'auto', source: true },
  className = '',
  ...props
}: CloudinaryImageProps) {
  // Preset defaults
  let defaultWidth = width;
  let defaultHeight = height;
  let variantClasses = className;

  if (variant === 'logo') {
    defaultWidth = width || 180;
    defaultHeight = height || 60;
    variantClasses = `object-contain ${className}`.trim();
  } else if (variant === 'appIcon') {
    defaultWidth = width || 128;
    defaultHeight = height || 128;
    variantClasses = `rounded-2xl shadow-md overflow-hidden ${className}`.trim();
  } else if (variant === 'photo') {
    defaultWidth = width || 800;
    defaultHeight = height || 500;
    variantClasses = `rounded-lg object-cover ${className}`.trim();
  }

  return (
    <CldImage
      src={src}
      alt={alt}
      width={defaultWidth}
      height={defaultHeight}
      crop={crop}
      className={variantClasses}
      {...props}
    />
  );
}

export default CloudinaryImage;
