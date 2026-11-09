'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Loader2, AlertCircle, Check } from 'lucide-react';

interface ImageUploadControlProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  brandLogoUrl?: string;
  onUseBrandLogo?: () => void;
}

export function ImageUploadControl({
  label = 'Image',
  value,
  onChange,
  brandLogoUrl,
  onUseBrandLogo,
}: ImageUploadControlProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.data.url);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload image'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
          {label}
        </label>
        {brandLogoUrl && onUseBrandLogo && (
          <button
            type="button"
            onClick={onUseBrandLogo}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Use Brand Logo
          </button>
        )}
      </div>

      {/* Image Preview */}
      {value && (
        <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-1 flex justify-center items-center max-h-36">
          <img
            src={value}
            alt="Upload Preview"
            className="max-h-32 max-w-full object-contain rounded"
          />
        </div>
      )}

      {/* URL Input */}
      <div className="relative">
        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.png"
          className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        />
      </div>

      {/* File Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Uploading image...</span>
            </>
          ) : uploadSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Uploaded successfully</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload from device (Max 5MB)</span>
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <div className="flex items-center space-x-1 text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}

