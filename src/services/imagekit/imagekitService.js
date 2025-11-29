import ImageKit from 'imagekit';

let imagekit = null;

function getImageKit() {
  if (!imagekit) {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return imagekit;
}

/**
 * Upload image to ImageKit
 * @param {Buffer} fileBuffer - Image buffer (already converted to WebP)
 * @param {string} fileName - Name for the file
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise<Object>} Upload result with URL
 */
export async function uploadImage(fileBuffer, fileName, folder = 'workouts') {
  try {
    const ik = getImageKit();
    
    const result = await ik.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
      transformation: {
        pre: 'w-800,h-600,c-at_max', // Max dimensions
      },
    });

    return {
      success: true,
      url: result.url,
      fileId: result.fileId,
      thumbnailUrl: result.thumbnailUrl,
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete image from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<boolean>}
 */
export async function deleteImage(fileId) {
  try {
    const ik = getImageKit();
    await ik.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return false;
  }
}

/**
 * Get authentication parameters for client-side upload
 * @returns {Object} Auth parameters
 */
export function getAuthParams() {
  const ik = getImageKit();
  return ik.getAuthenticationParameters();
}

