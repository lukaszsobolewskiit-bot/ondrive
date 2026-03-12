// onedrive.js - Microsoft Graph API integration
const axios = require('axios');
const FormData = require('form-data');

let accessToken = null;
let tokenExpiry = null;

// Get OAuth2 token using Client Credentials flow
async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AZURE_CLIENT_ID,
    client_secret: process.env.AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default'
  });

  const response = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
  return accessToken;
}

function graphHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const ROOT = () => process.env.ONEDRIVE_ROOT_FOLDER || 'PortalUzytkownikow';

// Ensure folder exists, create if not
async function ensureFolder(folderPath) {
  const token = await getAccessToken();
  const parts = folderPath.split('/').filter(Boolean);
  let currentPath = '/me/drive/root';

  for (const part of parts) {
    try {
      await axios.get(
        `https://graph.microsoft.com/v1.0${currentPath}:/${encodeURIComponent(part)}`,
        { headers: graphHeaders(token) }
      );
    } catch (err) {
      if (err.response?.status === 404) {
        const parentPath = currentPath === '/me/drive/root'
          ? '/me/drive/root/children'
          : `https://graph.microsoft.com/v1.0${currentPath}:/children`;

        await axios.post(
          `https://graph.microsoft.com/v1.0${currentPath}/children`,
          { name: part, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' },
          { headers: graphHeaders(token) }
        );
      }
    }
    currentPath = `${currentPath}:/${encodeURIComponent(part)}:`;
  }
}

// List files in user folder
async function listFiles(userFolder) {
  const token = await getAccessToken();
  const path = `${ROOT()}/${userFolder}`;

  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/children`,
      { headers: graphHeaders(token) }
    );
    return response.data.value || [];
  } catch (err) {
    if (err.response?.status === 404) {
      await ensureFolder(path);
      return [];
    }
    throw err;
  }
}

// Upload file to user folder
async function uploadFile(userFolder, filename, buffer) {
  const token = await getAccessToken();
  const folderPath = `${ROOT()}/${userFolder}`;
  await ensureFolder(folderPath);

  const filePath = `${folderPath}/${filename}`;

  // Use upload session for files > 4MB
  if (buffer.length > 4 * 1024 * 1024) {
    return uploadLargeFile(token, filePath, buffer);
  }

  const response = await axios.put(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(filePath)}:/content`,
    buffer,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      }
    }
  );
  return response.data;
}

// Upload session for large files
async function uploadLargeFile(token, filePath, buffer) {
  const sessionRes = await axios.post(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(filePath)}:/createUploadSession`,
    { item: { '@microsoft.graph.conflictBehavior': 'rename' } },
    { headers: graphHeaders(token) }
  );

  const uploadUrl = sessionRes.data.uploadUrl;
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  let start = 0;

  while (start < buffer.length) {
    const end = Math.min(start + chunkSize - 1, buffer.length - 1);
    const chunk = buffer.slice(start, end + 1);

    const res = await axios.put(uploadUrl, chunk, {
      headers: {
        'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
        'Content-Length': chunk.length
      }
    });

    if (res.data.id) return res.data;
    start += chunkSize;
  }
}

// Delete file
async function deleteFile(userFolder, itemId) {
  const token = await getAccessToken();
  await axios.delete(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
    { headers: graphHeaders(token) }
  );
}

// Get download URL
async function getDownloadUrl(itemId) {
  const token = await getAccessToken();
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
    { headers: graphHeaders(token) }
  );
  return response.data['@microsoft.graph.downloadUrl'];
}

// Setup root folder on startup
async function setupRootFolder() {
  try {
    await ensureFolder(ROOT());
    console.log(`✅ OneDrive folder "${ROOT()}" ready`);
  } catch (err) {
    console.error('❌ OneDrive setup error:', err.message);
  }
}

module.exports = { listFiles, uploadFile, deleteFile, getDownloadUrl, ensureFolder, setupRootFolder };
