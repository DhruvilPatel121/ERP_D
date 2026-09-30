const { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Aaradhana Silver ERP',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    console.log('Loading dev server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load URL:', err);
      mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Log any page load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error) {
    console.error('Error during app initialization:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for app info
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', async () => {
  return app.getAppPath();
});

// IPC handler to open external URLs in default browser
ipcMain.handle('open-external', async (event, url: string) => {
  try {
    console.log('Opening external URL:', url);
    // Use openExternal with { activate: true } to ensure it opens in default browser
    await shell.openExternal(url, { activate: true });
    console.log('URL opened successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: (error as Error).message };
  }
});

// IPC handler to copy image to clipboard using Electron's native clipboard
ipcMain.handle('copy-image-to-clipboard', async (event, dataUrl: string) => {
  let tempPath = null;
  try {
    console.log('=== Starting clipboard copy operation ===');
    console.log('Data URL length:', dataUrl.length);
    
    // Remove data URL prefix if present
    const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    console.log('Base64 data length:', base64Data.length);
    
    // Create buffer from base64
    const buffer = Buffer.from(base64Data, 'base64');
    console.log('Buffer size:', buffer.length, 'bytes');
    
    if (buffer.length === 0) {
      throw new Error('Buffer is empty - invalid base64 data');
    }
    
    // Use temp file method as primary - most reliable across Electron versions
    tempPath = path.join(app.getPath('temp'), `temp_clipboard_${Date.now()}.png`);
    console.log('Writing to temp file:', tempPath);
    
    fs.writeFileSync(tempPath, buffer);
    console.log('Temp file written successfully');
    
    // Verify file was written
    const stats = fs.statSync(tempPath);
    console.log('Temp file size:', stats.size, 'bytes');
    
    if (stats.size === 0) {
      throw new Error('Temp file is empty');
    }
    
    // Create native image from temp file
    const image = nativeImage.createFromPath(tempPath);
    console.log('Image created from temp file, empty:', image.isEmpty());
    console.log('Image size:', image.getSize());
    
    if (image.isEmpty()) {
      throw new Error('Image created from temp file is empty');
    }
    
    // Try multiple clipboard methods for maximum compatibility
    let clipboardSuccess = false;
    
    // Method 1: Try clipboard.writeImage first (most reliable)
    try {
      console.log('Trying clipboard.writeImage...');
      if (typeof clipboard.writeImage === 'function') {
        clipboard.writeImage(image);
        clipboardSuccess = true;
        console.log('✓ clipboard.writeImage succeeded');
      } else {
        console.warn('clipboard.writeImage is not available, trying clipboard.write');
      }
    } catch (writeImageError) {
      console.warn('✗ clipboard.writeImage failed:', writeImageError.message);
    }
    
    // Method 2: Try clipboard.write with image object if method 1 failed
    if (!clipboardSuccess) {
      try {
        console.log('Trying clipboard.write({ image })...');
        clipboard.write({ image: image });
        clipboardSuccess = true;
        console.log('✓ clipboard.write({ image }) succeeded');
      } catch (writeError) {
        console.warn('✗ clipboard.write({ image }) failed:', writeError.message);
      }
    }
    
    if (!clipboardSuccess) {
      throw new Error('All clipboard methods failed');
    }
    
    // Give the clipboard a moment to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force clipboard availability check
    console.log('Forcing clipboard availability check...');
    const availableFormats = clipboard.availableFormats();
    console.log('Available clipboard formats:', availableFormats);
    
    // Only verify if readImage is available (some Electron versions don't have it)
    if (typeof clipboard.readImage === 'function') {
      try {
        const clipboardImage = clipboard.readImage();
        console.log('Verification - clipboard image empty:', clipboardImage.isEmpty());
        console.log('Verification - clipboard image size:', clipboardImage.getSize());
        
        if (clipboardImage.isEmpty()) {
          // Try one more time with a different approach
          console.log('Image appears empty, trying alternative method...');
          clipboard.writeImage(image);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const retryImage = clipboard.readImage();
          console.log('Retry verification - clipboard image empty:', retryImage.isEmpty());
          
          if (retryImage.isEmpty()) {
            throw new Error('Clipboard verification failed - image appears empty after write and retry');
          }
        }
      } catch (readError) {
        console.warn('Clipboard verification failed (readImage not available), but write may have succeeded:', readError.message);
      }
    } else {
      console.log('clipboard.readImage not available, skipping verification');
    }
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    tempPath = null;
    console.log('Temp file cleaned up');
    
    console.log('=== Clipboard copy successful ===');
    return { success: true };
  } catch (error) {
    console.error('=== Clipboard copy failed ===');
    console.error('Error details:', error);
    
    // Clean up temp file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
        console.log('Temp file cleaned up after error');
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
    }
    
    return { success: false, error: (error as Error).message };
  }
});
