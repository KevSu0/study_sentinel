/**
 * Capacitor Filesystem Plugin Mock
 * 
 * Mocks the Capacitor Filesystem plugin for testing file operations,
 * directory management, and storage functionality.
 */

const FilesystemMock = {
  // Mock file system storage
  _mockFiles: new Map(),
  _mockDirectories: new Set(['/', '/Documents', '/Cache', '/Data']),
  
  // Read file
  readFile: jest.fn().mockImplementation(async (options) => {
    const { path, directory, encoding } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (!FilesystemMock._mockFiles.has(fullPath)) {
      throw new Error(`File does not exist: ${fullPath}`);
    }
    
    const fileData = FilesystemMock._mockFiles.get(fullPath);
    
    if (encoding === 'utf8') {
      return { data: fileData.content };
    } else {
      // Return base64 encoded data
      return { data: btoa(fileData.content) };
    }
  }),
  
  // Write file
  writeFile: jest.fn().mockImplementation(async (options) => {
    const { path, data, directory, encoding, recursive } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    // Create directory if recursive is true
    if (recursive) {
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (dirPath && !FilesystemMock._mockDirectories.has(dirPath)) {
        FilesystemMock._mockDirectories.add(dirPath);
      }
    }
    
    const content = encoding === 'base64' ? atob(data) : data;
    
    FilesystemMock._mockFiles.set(fullPath, {
      content,
      size: content.length,
      mtime: Date.now(),
      ctime: Date.now(),
      type: 'file'
    });
    
    return { uri: `file://${fullPath}` };
  }),
  
  // Append to file
  appendFile: jest.fn().mockImplementation(async (options) => {
    const { path, data, directory, encoding } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    let existingContent = '';
    if (FilesystemMock._mockFiles.has(fullPath)) {
      existingContent = FilesystemMock._mockFiles.get(fullPath).content;
    }
    
    const newContent = encoding === 'base64' ? atob(data) : data;
    const finalContent = existingContent + newContent;
    
    FilesystemMock._mockFiles.set(fullPath, {
      content: finalContent,
      size: finalContent.length,
      mtime: Date.now(),
      ctime: FilesystemMock._mockFiles.has(fullPath) ? 
        FilesystemMock._mockFiles.get(fullPath).ctime : Date.now(),
      type: 'file'
    });
    
    return { uri: `file://${fullPath}` };
  }),
  
  // Delete file
  deleteFile: jest.fn().mockImplementation(async (options) => {
    const { path, directory } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (!FilesystemMock._mockFiles.has(fullPath)) {
      throw new Error(`File does not exist: ${fullPath}`);
    }
    
    FilesystemMock._mockFiles.delete(fullPath);
  }),
  
  // Create directory
  mkdir: jest.fn().mockImplementation(async (options) => {
    const { path, directory, recursive } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (recursive) {
      // Create all parent directories
      const parts = fullPath.split('/').filter(Boolean);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        FilesystemMock._mockDirectories.add(currentPath);
      }
    } else {
      // Check if parent directory exists
      const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (parentPath && !FilesystemMock._mockDirectories.has(parentPath)) {
        throw new Error(`Parent directory does not exist: ${parentPath}`);
      }
      FilesystemMock._mockDirectories.add(fullPath);
    }
  }),
  
  // Remove directory
  rmdir: jest.fn().mockImplementation(async (options) => {
    const { path, directory, recursive } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (!FilesystemMock._mockDirectories.has(fullPath)) {
      throw new Error(`Directory does not exist: ${fullPath}`);
    }
    
    if (recursive) {
      // Remove all files and subdirectories
      const toRemove = [];
      
      // Find all files in this directory
      for (const [filePath] of FilesystemMock._mockFiles) {
        if (filePath.startsWith(fullPath + '/')) {
          toRemove.push(filePath);
        }
      }
      
      // Remove files
      toRemove.forEach(filePath => FilesystemMock._mockFiles.delete(filePath));
      
      // Remove subdirectories
      const dirsToRemove = Array.from(FilesystemMock._mockDirectories)
        .filter(dir => dir.startsWith(fullPath + '/'));
      dirsToRemove.forEach(dir => FilesystemMock._mockDirectories.delete(dir));
    }
    
    FilesystemMock._mockDirectories.delete(fullPath);
  }),
  
  // Read directory
  readdir: jest.fn().mockImplementation(async (options) => {
    const { path, directory } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (!FilesystemMock._mockDirectories.has(fullPath)) {
      throw new Error(`Directory does not exist: ${fullPath}`);
    }
    
    const files = [];
    
    // Find files in this directory
    for (const [filePath, fileData] of FilesystemMock._mockFiles) {
      if (filePath.startsWith(fullPath + '/') && 
          !filePath.substring(fullPath.length + 1).includes('/')) {
        files.push({
          name: filePath.substring(fullPath.length + 1),
          type: 'file',
          size: fileData.size,
          mtime: fileData.mtime,
          ctime: fileData.ctime,
          uri: `file://${filePath}`
        });
      }
    }
    
    // Find subdirectories
    for (const dirPath of FilesystemMock._mockDirectories) {
      if (dirPath.startsWith(fullPath + '/') && 
          !dirPath.substring(fullPath.length + 1).includes('/')) {
        files.push({
          name: dirPath.substring(fullPath.length + 1),
          type: 'directory',
          size: 0,
          mtime: Date.now(),
          ctime: Date.now(),
          uri: `file://${dirPath}`
        });
      }
    }
    
    return { files };
  }),
  
  // Get file info
  stat: jest.fn().mockImplementation(async (options) => {
    const { path, directory } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    
    if (FilesystemMock._mockFiles.has(fullPath)) {
      const fileData = FilesystemMock._mockFiles.get(fullPath);
      return {
        type: 'file',
        size: fileData.size,
        mtime: fileData.mtime,
        ctime: fileData.ctime,
        uri: `file://${fullPath}`
      };
    }
    
    if (FilesystemMock._mockDirectories.has(fullPath)) {
      return {
        type: 'directory',
        size: 0,
        mtime: Date.now(),
        ctime: Date.now(),
        uri: `file://${fullPath}`
      };
    }
    
    throw new Error(`File or directory does not exist: ${fullPath}`);
  }),
  
  // Get URI for file
  getUri: jest.fn().mockImplementation(async (options) => {
    const { path, directory } = options;
    const fullPath = directory ? `${directory}${path}` : path;
    return { uri: `file://${fullPath}` };
  }),
  
  // Copy file
  copy: jest.fn().mockImplementation(async (options) => {
    const { from, to, directory, toDirectory } = options;
    const fromPath = directory ? `${directory}${from}` : from;
    const toPath = toDirectory ? `${toDirectory}${to}` : to;
    
    if (!FilesystemMock._mockFiles.has(fromPath)) {
      throw new Error(`Source file does not exist: ${fromPath}`);
    }
    
    const sourceData = FilesystemMock._mockFiles.get(fromPath);
    FilesystemMock._mockFiles.set(toPath, {
      ...sourceData,
      ctime: Date.now(),
      mtime: Date.now()
    });
    
    return { uri: `file://${toPath}` };
  }),
  
  // Rename file
  rename: jest.fn().mockImplementation(async (options) => {
    const { from, to, directory, toDirectory } = options;
    const fromPath = directory ? `${directory}${from}` : from;
    const toPath = toDirectory ? `${toDirectory}${to}` : to;
    
    if (!FilesystemMock._mockFiles.has(fromPath)) {
      throw new Error(`Source file does not exist: ${fromPath}`);
    }
    
    const sourceData = FilesystemMock._mockFiles.get(fromPath);
    FilesystemMock._mockFiles.set(toPath, {
      ...sourceData,
      mtime: Date.now()
    });
    FilesystemMock._mockFiles.delete(fromPath);
    
    return { uri: `file://${toPath}` };
  }),
  
  // Test helpers
  __createMockFile: (path, content, directory) => {
    const fullPath = directory ? `${directory}${path}` : path;
    FilesystemMock._mockFiles.set(fullPath, {
      content,
      size: content.length,
      mtime: Date.now(),
      ctime: Date.now(),
      type: 'file'
    });
  },
  
  __createMockDirectory: (path, directory) => {
    const fullPath = directory ? `${directory}${path}` : path;
    FilesystemMock._mockDirectories.add(fullPath);
  },
  
  __fileExists: (path, directory) => {
    const fullPath = directory ? `${directory}${path}` : path;
    return FilesystemMock._mockFiles.has(fullPath);
  },
  
  __directoryExists: (path, directory) => {
    const fullPath = directory ? `${directory}${path}` : path;
    return FilesystemMock._mockDirectories.has(fullPath);
  },
  
  __getFileContent: (path, directory) => {
    const fullPath = directory ? `${directory}${path}` : path;
    return FilesystemMock._mockFiles.get(fullPath)?.content;
  },
  
  __getAllFiles: () => {
    return Array.from(FilesystemMock._mockFiles.keys());
  },
  
  __getAllDirectories: () => {
    return Array.from(FilesystemMock._mockDirectories);
  },
  
  __simulateStorageError: () => {
    const originalWriteFile = FilesystemMock.writeFile;
    FilesystemMock.writeFile = jest.fn().mockRejectedValue(
      new Error('Insufficient storage space')
    );
    return () => {
      FilesystemMock.writeFile = originalWriteFile;
    };
  },
  
  __reset: () => {
    FilesystemMock._mockFiles.clear();
    FilesystemMock._mockDirectories.clear();
    FilesystemMock._mockDirectories.add('/');
    FilesystemMock._mockDirectories.add('/Documents');
    FilesystemMock._mockDirectories.add('/Cache');
    FilesystemMock._mockDirectories.add('/Data');
  }
};

module.exports = FilesystemMock;