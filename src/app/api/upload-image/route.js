import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadImage } from '@/services/imagekit/imagekitService';
import { verifyAuth } from '@/lib/authMiddleware';

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to WebP format with compression
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85 }) // High quality WebP
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // Generate filename
    const timestamp = Date.now();
    const fileName = `workout_${timestamp}.webp`;

    // Upload to ImageKit
    const result = await uploadImage(webpBuffer, fileName, 'workouts');

    return NextResponse.json({
      success: true,
      url: result.url,
      fileId: result.fileId,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

