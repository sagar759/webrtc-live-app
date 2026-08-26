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

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_CONTAINER_NAME || 'claims-media';

  if (!connectionString) {
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
 * Uploads a local file to Azure Blob Storage and returns its public URL.
 * Falls back to local path if Azure is not configured or upload fails.
 * 
 * @param {string} localFilePath - Path to the file on local disk
 * @param {string} blobName - Target filename in the container
 * @param {string} mimeType - Content type (e.g., 'image/png', 'video/webm')
 * @returns {Promise<string>} The public Azure Blob URL or the original local path
 */
async function uploadFileToAzure(localFilePath, blobName, mimeType) {
  const client = getContainerClient();

  if (!client) {
    console.log('[Azure Blob] No Azure credentials provided. Using local file path:', localFilePath);
    return localFilePath;
  }

  try {
    const cleanBlobName = (blobName || path.basename(localFilePath)).replace(/\\/g, '/');
    const blockBlobClient = client.getBlockBlobClient(cleanBlobName);

    console.log(`[Azure Blob] Uploading ${cleanBlobName} (${mimeType || 'unknown'})...`);

    const options = {};
    if (mimeType) {
      options.blobHTTPHeaders = { blobContentType: mimeType };
    }

    await blockBlobClient.uploadFile(localFilePath, options);

    const publicUrl = blockBlobClient.url;
    console.log(`[Azure Blob] Upload successful! Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`[Azure Blob] Upload failed for ${localFilePath}:`, error.message);
    // Fall back to local file path so the application flow does not break
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
    const blockBlobClient = client.getBlockBlobClient(blobName);
    console.log(`[Azure Blob] Uploading buffer ${blobName} (${mimeType || 'application/octet-stream'})...`);

    const options = {};
    if (mimeType) {
      options.blobHTTPHeaders = { blobContentType: mimeType };
    }

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
