import { zip, Zippable } from 'fflate';

export class CompressionService {
  
  /**
   * Compresses an array of File objects into a single Zip Blob.
   */
  public static async compressFiles(files: File[]): Promise<{ blob: Blob, name: string }> {
    return new Promise((resolve, reject) => {
      const zippableData: Zippable = {};

      // 1. Read all files into Uint8Arrays
      const readers = files.map(file => {
        return new Promise<void>((resolveFile, rejectFile) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              // Add to zippable structure using filename as key
              // Simple flattened structure (no folders) for now
              zippableData[file.name] = new Uint8Array(e.target.result as ArrayBuffer);
              resolveFile();
            }
          };
          reader.onerror = rejectFile;
          reader.readAsArrayBuffer(file);
        });
      });

      // 2. Wait for reads, then Zip
      Promise.all(readers).then(() => {
        zip(zippableData, { level: 6 }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            // Fix: Cast data to any to avoid TS2322 (SharedArrayBuffer mismatch)
            const blob = new Blob([data as any], { type: 'application/zip' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            resolve({ 
              blob, 
              name: `archive_${timestamp}.zip` 
            });
          }
        });
      }).catch(reject);
    });
  }
}