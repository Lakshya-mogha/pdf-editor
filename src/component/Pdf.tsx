import { useEffect, useState, useRef } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker"; // Required for PDF.js worker

interface PdfEditorProps {
  file: File;
}

interface TextBox {
  id: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
}

export default function PdfEditor({ file }: PdfEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]); // Array to store all the text boxes
  const [activeTextBox, setActiveTextBox] = useState<TextBox | undefined>(
    undefined
  ); // The currently active text box
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const loadPdf = async (pdfData: ArrayBuffer) => {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const doc = await loadingTask.promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    renderPage(doc, pageNum);
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

  const nextPage = () => {
    if (pageNum < totalPages) {
      setPageNum(pageNum + 1);
    }
  };

  const prevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  // Add or erase text based on mode
  const commitTextBoxToPdf = async () => {
    if (!pdfDoc) return;
    if (!canvasRef.current) return;

    const existingPdfBytes = await file.arrayBuffer();
    const pdfDocLib = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDocLib.getPages();
    const firstPage = pages[0];

    textBoxes.forEach((box) => {
      const canvasOffsetX = 184;
      const canvasOffsetY = 184;

      const adjustedX = box.x - (canvasRef.current?.offsetLeft ?? 0);
      const adjustedY = box.y - (canvasRef.current?.offsetTop ?? 0);
      console.log("x:", box.x, "y:", box.y);

      firstPage.drawText(box.text, {
        x: adjustedX,
        y: adjustedY,
        size: 24,
        color: rgb(0, 0, 0),
        maxWidth: box.width,
      });
    });

    // Save the modified PDF and reload it for the user to see the changes
    const editedPdfBytes = await pdfDocLib.save();
    setPdfBytes(editedPdfBytes);
    reloadEditedPdf(editedPdfBytes);
  };

  // Reload the modified PDF and render the first page again
  const reloadEditedPdf = async (editedPdfBytes: Uint8Array) => {
    const newPdfDoc = await pdfjsLib.getDocument(editedPdfBytes).promise;
    setPdfDoc(newPdfDoc);
    renderPage(newPdfDoc, pageNum);
  };

  const downloadEditedPdf = () => {
    if (!pdfBytes) return;

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edited.pdf";
    link.click();
  };

  // Handle canvas click to create a text box
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const xPos = event.clientX;
      const yPos = event.clientY;

      // Add a new text box at the clicked position
      const newTextBox: TextBox = {
        id: Date.now(),
        text: "Enter text...",
        x: xPos,
        y: yPos,
        width: 200,
        height: 50,
        isDragging: false,
        isResizing: true,
      };

      setTextBoxes([...textBoxes, newTextBox]);
      setActiveTextBox(newTextBox);
    }
  };

  // Handle dragging the text box
  const handleDragStart = (
    event: React.MouseEvent<HTMLCanvasElement | HTMLTextAreaElement>,
    id: number
  ) => {
    const box = textBoxes.find((box) => box.id === id);
    // event.preventDefault();
    if (event.target instanceof HTMLTextAreaElement ) {
      return;
    }
    event.preventDefault();
    if (box) {
      setActiveTextBox({ ...box, isDragging: true });
    }
  };

  // const handleDrag = (event: React.MouseEvent<HTMLCanvasElement>) => {
  //   if (activeTextBox && activeTextBox.isDragging) {
  //     const canvas = canvasRef.current;
  //     if (canvas) {
  //       const xPos = event.clientX;
  //       const yPos = event.clientY;

  //       setActiveTextBox({ ...activeTextBox, x: xPos, y: yPos });
  //       setTextBoxes(
  //         textBoxes.map((box) =>
  //           box.id === activeTextBox.id ? { ...box, x: xPos, y: yPos } : box
  //         )
  //       );
  //     }
  //   }
  // };

  const handleDragEnd = () => {
    if (activeTextBox) {
      setActiveTextBox({ ...activeTextBox, isDragging: false });
    }
  };

  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
    id: number
  ) => {
    if (event.target instanceof HTMLInputElement) {
      const updatedText = event.target.value;
      setTextBoxes(
        textBoxes.map((box) =>
          box.id === id ? { ...box, text: updatedText } : box
        )
      );
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
  }, [file, pageNum]);

  return (
    <div>
      <h2>Client-Side PDF Editor</h2>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        // onMouseMove={(event) => {
        //   handleDrag(event);
        // }}
        // onMouseUp={handleDragEnd}
        className="min-h-fit min-w-fit"
      ></canvas>

      <div>
        <button onClick={prevPage}>Previous Page</button>
        <button onClick={nextPage}>Next Page</button>
        <span>
          Page {pageNum} of {totalPages}
        </span>
      </div>

      {textBoxes.map((box) => (
        <textarea
          // type="text"
          placeholder="Enter Text..."
          // draggable="true"
          disabled={false}
          onChange={(event) => {
            handleTextChange(event, box.id);
          }}
          key={box.id}
          style={{
            position: "absolute",
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `auto`,
            background: "white",
          }}
          onMouseDownCapture={(e) => {
            handleDragStart(e, box.id);
          }}
          onMouseUp={handleDragEnd}
        />
      ))}

      <div>
        <button onClick={commitTextBoxToPdf}>Commit to PDF</button>
        {pdfBytes && (
          <button onClick={downloadEditedPdf} style={{ marginLeft: 20 }}>
            Download Edited PDF
          </button>
        )}
      </div>
    </div>
  );
}
