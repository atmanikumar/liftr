#!/usr/bin/env python3
"""
Generate iOS app icons from logo.png
"""

import os
import sys
from PIL import Image

# Icon sizes needed for iOS
ICON_SIZES = {
    'AppIcon-20x20@2x.png': 40,
    'AppIcon-20x20@3x.png': 60,
    'AppIcon-29x29@2x.png': 58,
    'AppIcon-29x29@3x.png': 87,
    'AppIcon-40x40@2x.png': 80,
    'AppIcon-40x40@3x.png': 120,
    'AppIcon-60x60@2x.png': 120,
    'AppIcon-60x60@3x.png': 180,
    'AppIcon-76x76@1x.png': 76,
    'AppIcon-76x76@2x.png': 152,
    'AppIcon-83.5x83.5@2x.png': 167,
    'AppIcon-1024x1024@1x.png': 1024,
}

def main():
    print("🎨 Generating iOS app icons from logo.png...")
    
    # Paths
    source_path = 'public/logo.png'
    output_dir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset'
    
    # Check source exists
    if not os.path.exists(source_path):
        print(f"❌ Source file not found: {source_path}")
        sys.exit(1)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load source image
    try:
        img = Image.open(source_path)
        print(f"✅ Loaded logo.png ({img.size[0]}x{img.size[1]})")
    except Exception as e:
        print(f"❌ Failed to load image: {e}")
        sys.exit(1)
    
    # Generate each size
    for filename, size in ICON_SIZES.items():
        output_path = os.path.join(output_dir, filename)
        try:
            # Resize with high-quality lanczos resampling
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(output_path, 'PNG', optimize=True)
            print(f"  📱 Created {filename} ({size}x{size})")
        except Exception as e:
            print(f"  ❌ Failed to create {filename}: {e}")
    
    print(f"\n✅ iOS app icons generated successfully!")
    print(f"📍 Location: {output_dir}")
    print("\nNext steps:")
    print("1. Open Xcode: npx cap open ios")
    print("2. Build and run to see your new Spartan warrior icon!")

if __name__ == '__main__':
    main()

