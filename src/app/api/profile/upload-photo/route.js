import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateUserProfilePhoto, getUserById } from '@/lib/storage';

// ImageKit is a CommonJS module, so we use dynamic require
const ImageKit = require('imagekit');

// Initialize ImageKit client
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export async function POST(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 2MB limit. Please compress your image.' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Get user's current profile photo to delete old one
    const user = await getUserById(decoded.id);
    const oldPhotoUrl = user?.profilePhoto;

    // Delete old image from ImageKit if it exists
    if (oldPhotoUrl && oldPhotoUrl.includes('imagekit.io')) {
      try {
        // Extract fileId from URL or use the path
        // ImageKit URL format: https://ik.imagekit.io/your_id/path/filename
        const urlParts = oldPhotoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // List files to find the fileId
        const listResponse = await imagekit.listFiles({
          searchQuery: `name="${fileName}"`,
          limit: 1,
        });

        if (listResponse.length > 0) {
          await imagekit.deleteFile(listResponse[0].fileId);
          console.log(`Deleted old profile photo for user ${decoded.id}`);
        }
      } catch (delError) {
        console.error('Failed to delete old ImageKit file:', delError);
        // Continue anyway - don't fail the upload if deletion fails
      }
    }

    // Convert file to buffer for ImageKit upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to ImageKit with consistent filename
    const fileExtension = file.type.split('/')[1];
    const fileName = `${decoded.id}.${fileExtension}`;
    
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: fileName,
      folder: '/profile-photos',
      useUniqueFileName: false, // Don't add random suffix - use consistent filename
      tags: [`user-${decoded.id}`, 'profile-photo'],
    });

    // Update user's profile photo in database
    const success = await updateUserProfilePhoto(decoded.id, uploadResponse.url);

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to update profile photo in database' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      photoUrl: uploadResponse.url,
      message: 'Profile photo updated successfully'
    });

  } catch (error) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload profile photo',
      details: error.message 
    }, { status: 500 });
  }
}

