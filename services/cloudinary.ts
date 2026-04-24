import axios from 'axios';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;

/**
 * Upload an image to Cloudinary using signed upload (resilient).
 */
export async function uploadToCloudinary(uri: string, identifier?: string): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Cloudinary credentials missing in .env');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = 'delivery_proofs';
  const fileName = identifier ? `proof_${identifier}_${timestamp}` : `proof_${timestamp}`;

  let signature = '';
  try {
    // Dynamically require expo-crypto to avoid crash if not installed/linked correctly
    const Crypto = require('expo-crypto');
    const signatureString = `folder=${folder}&public_id=${fileName}&timestamp=${timestamp}${API_SECRET}`;
    signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      signatureString
    );
  } catch (e) {
    console.error('[cloudinary] Signature generation failed. If you are in Expo Go, make sure expo-crypto is ready.', e);
    throw new Error('Crypto module not available for signed upload.');
  }

  const formData = new FormData();
  // @ts-ignore
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `${fileName}.jpg`,
  });
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', fileName);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.secure_url;
  } catch (err: any) {
    if (err.response) {
      console.error('[cloudinary] Response error:', err.response.data);
    }
    throw err;
  }
}
