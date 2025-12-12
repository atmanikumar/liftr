#!/bin/bash

# Script to generate iOS app icons from logo.png
# This creates all required iOS icon sizes

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "❌ Please install Homebrew first: https://brew.sh"
        exit 1
    fi
fi

echo "🎨 Generating iOS app icons from logo.png..."

# Create icons directory
ICONS_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$ICONS_DIR"

# Source image
SOURCE="public/logo.png"

if [ ! -f "$SOURCE" ]; then
    echo "❌ Source file not found: $SOURCE"
    exit 1
fi

# iOS icon sizes (name: size)
declare -A sizes=(
    ["Icon-20@2x"]=40
    ["Icon-20@3x"]=60
    ["Icon-29@2x"]=58
    ["Icon-29@3x"]=87
    ["Icon-40@2x"]=80
    ["Icon-40@3x"]=120
    ["Icon-60@2x"]=120
    ["Icon-60@3x"]=180
    ["Icon-76"]=76
    ["Icon-76@2x"]=152
    ["Icon-83.5@2x"]=167
    ["Icon-1024"]=1024
)

# Generate each size
for name in "${!sizes[@]}"; do
    size=${sizes[$name]}
    output="$ICONS_DIR/${name}.png"
    echo "  📱 Creating ${name}.png (${size}x${size})"
    convert "$SOURCE" -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "$output"
done

# Create Contents.json
echo "📝 Creating Contents.json..."
cat > "$ICONS_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "Icon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "Icon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "Icon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "Icon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "Icon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "Icon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "Icon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "Icon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "Icon-76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "Icon-76@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "Icon-83.5@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "Icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

echo ""
echo "✅ iOS app icons generated successfully!"
echo "📍 Location: $ICONS_DIR"
echo ""
echo "Next steps:"
echo "1. Open Xcode: npx cap open ios"
echo "2. The icons should appear automatically in Assets.xcassets"
echo "3. Build and run your app to see the new icon!"

