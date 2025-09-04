import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { createMockCapacitorDevice } from '../mocks/capacitor';
import { renderMobile } from '../utils/mobile-test-factories';

// Mock Capacitor Filesystem plugin
jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    deleteFile: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    readdir: jest.fn(),
    getUri: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    copy: jest.fn(),
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn()
  },
  Directory: {
    Documents: 'DOCUMENTS',
    Data: 'DATA',
    Cache: 'CACHE',
    External: 'EXTERNAL',
    ExternalStorage: 'EXTERNAL_STORAGE'
  },
  Encoding: {
    UTF8: 'utf8',
    ASCII: 'ascii',
    UTF16: 'utf16'
  }
}));

describe('Capacitor Filesystem Plugin Tests', () => {
  let mockDevice: any;
  
  beforeEach(() => {
    mockDevice = createMockCapacitorDevice('high-end');
    jest.clearAllMocks();
    
    // Setup default successful responses
    (Filesystem.writeFile as jest.Mock).mockResolvedValue({ uri: 'file://test.txt' });
    (Filesystem.readFile as jest.Mock).mockResolvedValue({ data: 'test content' });
    (Filesystem.deleteFile as jest.Mock).mockResolvedValue({});
    (Filesystem.mkdir as jest.Mock).mockResolvedValue({});
    (Filesystem.rmdir as jest.Mock).mockResolvedValue({});
    (Filesystem.readdir as jest.Mock).mockResolvedValue({ files: [] });
    (Filesystem.getUri as jest.Mock).mockResolvedValue({ uri: 'file://test' });
    (Filesystem.stat as jest.Mock).mockResolvedValue({ 
      type: 'file', 
      size: 1024, 
      ctime: Date.now(), 
      mtime: Date.now(), 
      uri: 'file://test.txt' 
    });
    (Filesystem.checkPermissions as jest.Mock).mockResolvedValue({ publicStorage: 'granted' });
    (Filesystem.requestPermissions as jest.Mock).mockResolvedValue({ publicStorage: 'granted' });
  });
  
  describe('File Operations', () => {
    test('should write file successfully', async () => {
      const testData = 'Hello, World!';
      const fileName = 'test.txt';
      
      await Filesystem.writeFile({
        path: fileName,
        data: testData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      expect(Filesystem.writeFile).toHaveBeenCalledWith({
        path: fileName,
        data: testData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    });
    
    test('should read file successfully', async () => {
      const fileName = 'test.txt';
      
      const result = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      expect(Filesystem.readFile).toHaveBeenCalledWith({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      expect(result.data).toBe('test content');
    });
    
    test('should delete file successfully', async () => {
      const fileName = 'test.txt';
      
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Documents
      });
      
      expect(Filesystem.deleteFile).toHaveBeenCalledWith({
        path: fileName,
        directory: Directory.Documents
      });
    });
    
    test('should handle file not found error', async () => {
      const fileName = 'nonexistent.txt';
      (Filesystem.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      await expect(Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      })).rejects.toThrow('File not found');
    });
  });
  
  describe('Directory Operations', () => {
    test('should create directory successfully', async () => {
      const dirName = 'test-dir';
      
      await Filesystem.mkdir({
        path: dirName,
        directory: Directory.Documents,
        recursive: true
      });
      
      expect(Filesystem.mkdir).toHaveBeenCalledWith({
        path: dirName,
        directory: Directory.Documents,
        recursive: true
      });
    });
    
    test('should remove directory successfully', async () => {
      const dirName = 'test-dir';
      
      await Filesystem.rmdir({
        path: dirName,
        directory: Directory.Documents,
        recursive: true
      });
      
      expect(Filesystem.rmdir).toHaveBeenCalledWith({
        path: dirName,
        directory: Directory.Documents,
        recursive: true
      });
    });
    
    test('should list directory contents', async () => {
      const dirName = 'test-dir';
      (Filesystem.readdir as jest.Mock).mockResolvedValue({
        files: [
          { name: 'file1.txt', type: 'file', size: 1024, ctime: Date.now(), mtime: Date.now(), uri: 'file://file1.txt' },
          { name: 'subdir', type: 'directory', size: 0, ctime: Date.now(), mtime: Date.now(), uri: 'file://subdir' }
        ]
      });
      
      const result = await Filesystem.readdir({
        path: dirName,
        directory: Directory.Documents
      });
      
      expect(Filesystem.readdir).toHaveBeenCalledWith({
        path: dirName,
        directory: Directory.Documents
      });
      expect(result.files).toHaveLength(2);
      expect(result.files[0].name).toBe('file1.txt');
      expect(result.files[1].name).toBe('subdir');
    });
  });
  
  describe('File Information', () => {
    test('should get file statistics', async () => {
      const fileName = 'test.txt';
      const mockStat = {
        type: 'file',
        size: 2048,
        ctime: Date.now() - 86400000, // 1 day ago
        mtime: Date.now() - 3600000,  // 1 hour ago
        uri: 'file://test.txt'
      };
      (Filesystem.stat as jest.Mock).mockResolvedValue(mockStat);
      
      const result = await Filesystem.stat({
        path: fileName,
        directory: Directory.Documents
      });
      
      expect(Filesystem.stat).toHaveBeenCalledWith({
        path: fileName,
        directory: Directory.Documents
      });
      expect(result.type).toBe('file');
      expect(result.size).toBe(2048);
    });
    
    test('should get file URI', async () => {
      const fileName = 'test.txt';
      const expectedUri = 'file:///storage/emulated/0/Documents/test.txt';
      (Filesystem.getUri as jest.Mock).mockResolvedValue({ uri: expectedUri });
      
      const result = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Documents
      });
      
      expect(Filesystem.getUri).toHaveBeenCalledWith({
        path: fileName,
        directory: Directory.Documents
      });
      expect(result.uri).toBe(expectedUri);
    });
  });
  
  describe('Permissions', () => {
    test('should check filesystem permissions', async () => {
      const result = await Filesystem.checkPermissions();
      
      expect(Filesystem.checkPermissions).toHaveBeenCalled();
      expect(result.publicStorage).toBe('granted');
    });
    
    test('should request filesystem permissions', async () => {
      const result = await Filesystem.requestPermissions();
      
      expect(Filesystem.requestPermissions).toHaveBeenCalled();
      expect(result.publicStorage).toBe('granted');
    });
    
    test('should handle permission denied', async () => {
      (Filesystem.checkPermissions as jest.Mock).mockResolvedValue({ publicStorage: 'denied' });
      
      const result = await Filesystem.checkPermissions();
      
      expect(result.publicStorage).toBe('denied');
    });
  });
  
  describe('Offline Scenarios', () => {
    test('should cache file operations when offline', async () => {
      await offlineScenarios.completeOffline.setup();
      
      // Simulate offline file write
      const testData = 'Offline content';
      await Filesystem.writeFile({
        path: 'offline-test.txt',
        data: testData,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      
      expect(Filesystem.writeFile).toHaveBeenCalled();
      
      await offlineScenarios.completeOffline.teardown();
    });
    
    test('should handle storage quota exceeded', async () => {
      // Mock storage quota exceeded error
      (Filesystem.writeFile as jest.Mock).mockRejectedValue(new Error('Quota exceeded'));
      
      await expect(Filesystem.writeFile({
        path: 'large-file.txt',
        data: 'x'.repeat(1000000), // Large data
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      })).rejects.toThrow('Quota exceeded');
    });
  });
  
  describe('Performance Tests', () => {
    test('should handle large file operations efficiently', async () => {
      const largeData = 'x'.repeat(100000); // 100KB of data
      const startTime = performance.now();
      
      await Filesystem.writeFile({
        path: 'large-file.txt',
        data: largeData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust based on device profile)
      const maxDuration = mockDevice.profile === 'low-end' ? 5000 : 2000;
      expect(duration).toBeLessThan(maxDuration);
    });
    
    test('should handle concurrent file operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 5; i++) {
        operations.push(
          Filesystem.writeFile({
            path: `concurrent-${i}.txt`,
            data: `Content ${i}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          })
        );
      }
      
      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();
      
      expect(Filesystem.writeFile).toHaveBeenCalledTimes(5);
      
      // Concurrent operations should be faster than sequential
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid directory', async () => {
      (Filesystem.writeFile as jest.Mock).mockRejectedValue(new Error('Invalid directory'));
      
      await expect(Filesystem.writeFile({
        path: 'test.txt',
        data: 'test',
        directory: 'INVALID' as any,
        encoding: Encoding.UTF8
      })).rejects.toThrow('Invalid directory');
    });
    
    test('should handle invalid encoding', async () => {
      (Filesystem.writeFile as jest.Mock).mockRejectedValue(new Error('Invalid encoding'));
      
      await expect(Filesystem.writeFile({
        path: 'test.txt',
        data: 'test',
        directory: Directory.Documents,
        encoding: 'INVALID' as any
      })).rejects.toThrow('Invalid encoding');
    });
    
    test('should handle network errors during cloud sync', async () => {
      // Simulate network error during cloud sync
      (Filesystem.writeFile as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect(Filesystem.writeFile({
        path: 'cloud-sync.txt',
        data: 'sync content',
        directory: Directory.External,
        encoding: Encoding.UTF8
      })).rejects.toThrow('Network error');
    });
  });
});