"use client";
import { useState } from 'react';
import Pdf from '@/component/Pdf';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">PDF Uploader</h1>
      <div className="mb-4">
        <label htmlFor="pdfUpload" className="block mb-2">
          Select a PDF file:
        </label>
        <input
          type="file"
          id="pdfUpload"
          accept=".pdf"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
      </div>
      {selectedFile && <Pdf file={selectedFile} />}
    </div>
  );
}
