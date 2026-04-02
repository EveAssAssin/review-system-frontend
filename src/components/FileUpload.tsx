import { useState, useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  existingFiles?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: 'image' | 'video';
  }>;
  onDeleteExisting?: (id: string) => void;
}

export default function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 50,
  accept = 'image/*,video/*',
  existingFiles = [],
  onDeleteExisting,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError('');

    // 檢查數量
    if (files.length + selectedFiles.length + existingFiles.length > maxFiles) {
      setError(`最多只能上傳 ${maxFiles} 個檔案`);
      return;
    }

    // 檢查大小
    const oversized = files.find(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      setError(`檔案 ${oversized.name} 超過 ${maxSizeMB}MB 限制`);
      return;
    }

    // 檢查類型
    const invalid = files.find(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    if (invalid) {
      setError(`檔案 ${invalid.name} 不是圖片或影片`);
      return;
    }

    // 產生預覽
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    setSelectedFiles(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesSelected([...selectedFiles, ...files]);

    // 清空 input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // 釋放 URL
    URL.revokeObjectURL(previews[index]);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onFilesSelected(newFiles);
  };

  return (
    <div className="space-y-3">
      {/* 上傳按鈕 */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-gray-500">
          <span className="text-blue-600">點擊上傳</span> 或拖曳檔案到這裡
        </div>
        <div className="text-xs text-gray-400 mt-1">
          支援圖片和影片，單檔最大 {maxSizeMB}MB，最多 {maxFiles} 個檔案
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {/* 已存在的檔案 */}
      {existingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {existingFiles.map((file) => (
            <div key={file.id} className="relative group">
              {file.file_type === 'image' ? (
                <img
                  src={file.file_url}
                  alt={file.file_name}
                  className="w-full h-24 object-cover rounded"
                />
              ) : (
                <video
                  src={file.file_url}
                  className="w-full h-24 object-cover rounded"
                />
              )}
              {onDeleteExisting && (
                <button
                  onClick={() => onDeleteExisting(file.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              )}
              <div className="text-xs text-gray-500 truncate mt-1">{file.file_name}</div>
            </div>
          ))}
        </div>
      )}

      {/* 新選擇的檔案預覽 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              {selectedFiles[index].type.startsWith('video/') ? (
                <video
                  src={preview}
                  className="w-full h-24 object-cover rounded"
                />
              ) : (
                <img
                  src={preview}
                  alt={selectedFiles[index].name}
                  className="w-full h-24 object-cover rounded"
                />
              )}
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
              <div className="text-xs text-gray-500 truncate mt-1">
                {selectedFiles[index].name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
