const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

let containerClient = null;

/**
 * Initializes and returns the Azure Blob container client.
 */
function getContainerClient() {
  if (containerClient) {
    return containerClient;
  }

  const rawConn = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
  const connectionString = rawConn.replace(/^["']|["']$/g, '').trim();
  const rawContainer = process.env.AZURE_CONTAINER_NAME || 'claims-media';
  const containerName = rawContainer.replace(/["']/g, '').trim();

  if (!connectionString) {
    console.warn('[Azure Blob] AZURE_STORAGE_CONNECTION_STRING is not defined.');
    return null;
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    return containerClient;
  } catch (error) {
    console.error('[Azure Blob] Error initializing BlobServiceClient:', error.message);
    return null;
  }
}

/**
 * Detects MIME type from file extension if not provided or generic
 */
function getAccurateMimeType(filePathOrName, defaultMime) {
  if (defaultMime && defaultMime !== 'application/octet-stream') {
    return defaultMime;
  }
  const ext = path.extname(filePathOrName).toLowerCase();
  switch (ext) {
    case '.webm':
      return 'video/webm';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.pdf':
      return 'application/pdf';
    default:
      return defaultMime || 'application/octet-stream';
  }
}

/**
 * Uploads a local file to Azure Blob Storage and returns its public URL.
 * Falls back to local path if Azure is not configured or upload fails.
 * 
 * @param {string} localFilePath - Path to the file on local disk
 * @param {string} blobName - Target filename in the container
 * @param {string} mimeType - Content type (e.g., 'image/png', 'video/webm', 'video/mp4')
 * @returns {Promise<string>} The public Azure Blob URL or the original local path
 */
async function uploadFileToAzure(localFilePath, blobName, mimeType) {
  const client = getContainerClient();

  if (!client) {
    console.log('[Azure Blob] No Azure credentials provided. Using local file path:', localFilePath);
    return localFilePath;
  }

  try {
    // Ensure container exists
    try {
      await client.createIfNotExists();
    } catch (createErr) {
      // Ignored if already exists or permission restricted to container level
    }

    const cleanBlobName = (blobName || path.basename(localFilePath)).replace(/\\/g, '/');
    const blockBlobClient = client.getBlockBlobClient(cleanBlobName);

    const accurateMime = getAccurateMimeType(cleanBlobName, mimeType);
    console.log(`[Azure Blob] Uploading ${cleanBlobName} (${accurateMime})...`);

    const options = {
      blobHTTPHeaders: {
        blobContentType: accurateMime,
        blobContentDisposition: 'inline'
      }
    };

    await blockBlobClient.uploadFile(localFilePath, options);

    const publicUrl = blockBlobClient.url;
    console.log(`[Azure Blob] Upload successful! Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`[Azure Blob] Upload failed for ${localFilePath}:`, error.message);
    return localFilePath;
  }
}

/**
 * Uploads a buffer directly to Azure Blob Storage and returns its public URL.
 * 
 * @param {Buffer} buffer - File buffer in memory
 * @param {string} blobName - Target filename in the container
 * @param {string} mimeType - Content type
 * @returns {Promise<string|null>} The public Azure Blob URL or null if failed
 */
async function uploadBufferToAzure(buffer, blobName, mimeType) {
  const client = getContainerClient();

  if (!client) {
    console.log('[Azure Blob] Azure not configured for buffer upload.');
    return null;
  }

  try {
    try {
      await client.createIfNotExists();
    } catch (createErr) {}

    const cleanBlobName = blobName.replace(/\\/g, '/');
    const blockBlobClient = client.getBlockBlobClient(cleanBlobName);
    const accurateMime = getAccurateMimeType(cleanBlobName, mimeType);

    console.log(`[Azure Blob] Uploading buffer ${cleanBlobName} (${accurateMime})...`);

    const options = {
      blobHTTPHeaders: {
        blobContentType: accurateMime,
        blobContentDisposition: 'inline'
      }
    };

    await blockBlobClient.uploadData(buffer, options);

    const publicUrl = blockBlobClient.url;
    console.log(`[Azure Blob] Buffer upload successful! Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`[Azure Blob] Buffer upload failed for ${blobName}:`, error.message);
    return null;
  }
}

module.exports = {
  uploadFileToAzure,
  uploadBufferToAzure,
  getContainerClient,
};
