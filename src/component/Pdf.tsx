import { PDFDocument } from "pdf-lib";

import React, { useEffect, useState } from "react";

interface PdfLibIf {
  file: File;
}

function Pdf({ file }: PdfLibIf) {
  const [editedPdfDoc, setEditedPdfDoc] = useState<Uint8Array>();
  const [pdf, setPdf] = useState<PDFDocument>();
  const [pdfUrl, setPdfUrl] = useState("");

  const loadPdf = async (pdfData: ArrayBuffer) => {
    const pdfLibDoc = await PDFDocument.load(pdfData);
    setPdf(pdfLibDoc);
    if (pdf) {
      // const pages = pdf.getPages();
      // const firstPage = pages[0];

      // const { width, height } = firstPage.getSize();

      // // Draw a string of text diagonally across the first page
      // firstPage.drawText("This text was added with JavaScript!", {
      //   x: 5,
      //   y: height / 2 + 300,
      //   size: 50,
      //   font: helveticaFont,
      //   color: rgb(0.95, 0.1, 0.1),
      //   rotate: degrees(-45),
      // });

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await pdf.save();
      setEditedPdfDoc(pdfBytes);
    }
  };

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const pdfData = reader.result as ArrayBuffer;
        loadPdf(pdfData);
      }
    };
    if (file) {
      reader.readAsArrayBuffer(file);
    }
  }, [file]);

  useEffect(() => {
    if (editedPdfDoc) {
      const blob = new Blob([editedPdfDoc], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } else {
      const blob = new Blob([file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    }

    return () => {
      URL.revokeObjectURL(pdfUrl);
    };
  }, [editedPdfDoc]);

  return (
    <div>
      <iframe
        src={pdfUrl}
        width="100%"
        height="900px"
        style={{ border: "none" }}
        title="PDF Viewer"
      />
    </div>
  );
}

export default Pdf;
