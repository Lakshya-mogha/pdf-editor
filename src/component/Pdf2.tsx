import React, { useState, useRef, useEffect } from "react";
import { PDFDocument, PDFPage } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs"

interface PdfEditorProps {
  file: File;
}

interface PdfEditorState {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pdfBytes: Uint8Array | null;
  pageNum: number;
  text: string;
}

interface CustomPDFPage extends PDFPage {
  getViewport(options: any): any;
}

const PdfEditor: React.FC<PdfEditorProps> = ({ file }) => {
  const [pdfDoc, setPdfDoc] = useState<PdfEditorState["pdfDoc"]>(null);
  const [pdfBytes, setPdfBytes] = useState<PdfEditorState["pdfBytes"]>(null);
  const [pageNum, setPageNum] = useState<PdfEditorState["pageNum"]>(1);
  const [text, setText] = useState<PdfEditorState["text"]>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key === "Enter") {
      // commitTextBoxToPdf();
    } else if (event.key === "Backspace") {
      setText(text.slice(0, -1));
    } else {
      setText(text + event.key);
    }
  };

  const handleCanvasClick: React.MouseEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const xPos = event.clientX;
      const yPos = event.clientY;

      const context = canvas.getContext("2d");
      if (context) {
        context.font = "24px Arial";
        context.fillStyle = "black";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(text, xPos, yPos);
      }
    }
  };

  // const commitTextBoxToPdf = async () => {
  //   if (pdfDoc && text) {
  //     const page = pdfDoc.getPage(pageNum);

  //     const x = (page.getWidth() - 100) / 2;
  //     const y = (page.getHeight() - 24) / 2;

  //     page.drawText(text, {
  //       x,
  //       y,
  //       size: 24,
  //     });

  //     const editedPdf = await pdfDoc.save();
  //     setPdfBytes(editedPdf);
  //   }
  // };

  const downloadEditedPdf = () => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "edited.pdf";
      link.click();
    }
  };

  const renderPage = async (
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number
  ) => {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;

    if (canvas) {
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context!,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      try {
        await renderTaskRef.current.promise;
      } catch (err) {
        if (err instanceof pdfjsLib.RenderingCancelledException) {
          console.log("Rendering cancelled");
        } else {
          console.error(err);
        }
      }
    }
  };

  // useEffect(() => {
  //   if (!pdfDoc) {
  //     const url = "https://example.com/sample.pdf"; // Replace with your PDF URL
  //     fetch(url)
  //       .then((response) => response.arrayBuffer())
  //       .then((arrayBuffer) => {
  //         const pdfBytes = new Uint8Array(arrayBuffer);
  //         import("pdf-lib").then(({ PDFDocument }) => {
  //           PDFDocument.load(pdfBytes).then((pdfDoc) => {
  //             setPdfDoc(pdfDoc);
  //             renderPage(pdfDoc, pageNum);
  //           });
  //         });
  //       });
  //   }
  // }, [pdfDoc, pageNum]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = async () => {
      if (reader.result) {
        const pdfData = reader.result as ArrayBuffer;
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setPdfDoc(pdfDoc);
        renderPage(pdfDoc, pageNum);
      }
    };
    if (file) {
      reader.readAsArrayBuffer(file);
    }
  }, [file, pageNum]);

  return (
    <div>
      <canvas ref={canvasRef} onClick={handleCanvasClick} />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={downloadEditedPdf}>Download Edited PDF</button>
    </div>
  );
};

export default PdfEditor;
