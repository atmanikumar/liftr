const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS App Icon sizes (all required sizes)
const iconSizes = [
  { size: 20, scale: 2, name: 'AppIcon-20x20@2x.png' },
  { size: 20, scale: 3, name: 'AppIcon-20x20@3x.png' },
  { size: 29, scale: 2, name: 'AppIcon-29x29@2x.png' },
  { size: 29, scale: 3, name: 'AppIcon-29x29@3x.png' },
  { size: 40, scale: 2, name: 'AppIcon-40x40@2x.png' },
  { size: 40, scale: 3, name: 'AppIcon-40x40@3x.png' },
  { size: 60, scale: 2, name: 'AppIcon-60x60@2x.png' },
  { size: 60, scale: 3, name: 'AppIcon-60x60@3x.png' },
  { size: 1024, scale: 1, name: 'AppIcon-1024x1024@1x.png' }, // App Store
];

const inputFile = path.join(__dirname, 'public', 'logo.png');
const outputDir = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating iOS app icons from logo.png...\n');
  
  for (const icon of iconSizes) {
    const dimension = icon.size * icon.scale;
    const outputPath = path.join(outputDir, icon.name);
    
    try {
      await sharp(inputFile)
        .resize(dimension, dimension, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 } // Dark background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${icon.name} (${dimension}x${dimension})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }
  
  // Generate Contents.json for Xcode
  const contentsJson = {
    images: [
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-20x20@2x.png', scale: '2x' },
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-20x20@3x.png', scale: '3x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-29x29@2x.png', scale: '2x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-29x29@3x.png', scale: '3x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-40x40@2x.png', scale: '2x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-40x40@3x.png', scale: '3x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@2x.png', scale: '2x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@3x.png', scale: '3x' },
      { size: '1024x1024', idiom: 'ios-marketing', filename: 'AppIcon-1024x1024@1x.png', scale: '1x' },
    ],
    info: {
      version: 1,
      author: 'xcode'
    }
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  
  console.log('\n✓ Generated Contents.json');
  console.log('\n✅ All iOS app icons generated successfully!');
  console.log(`📁 Icons location: ${outputDir}`);
}

generateIcons().catch(console.error);

