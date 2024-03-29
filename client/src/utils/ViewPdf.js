import React, { useEffect, useState } from "react";

//PDF
import ReactToPdf from "react-to-pdf";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

import "../styles/view_pdf.css";
import { GetWindowWidth } from "./getWindowWidth";

import * as IoIcons from "react-icons/io";
import { cloudname } from "../constants";

function ViewPdf({ pdfFile, closePDf }) {
  const [numPages, setNumPages] = useState(0);
  const [pdfWidth, setPdfWith] = useState(1000);
  const windowWidth = GetWindowWidth();
  https: pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  const pdfUrl = `https://res.cloudinary.com/${cloudname}/image/upload/fl_attachment/v1711537820/${pdfFile}.pdf`;

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    function handleKeyPress(event) {
      if (document.hasFocus() && event.keyCode === 27) {
        closePDf(null);
      }
    }

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  useEffect(() => {
    if (windowWidth <= 912) {
      setPdfWith(500);
    } else if (windowWidth <= 1024) {
      setPdfWith(700);
    }
  }, [windowWidth]);

  return (
    <section id="ViewPdf" className="ViewPdf">
      <div className="Close">
        <div className="Icon" onClick={() => closePDf(null)}>
          <IoIcons.IoMdClose size={"35px"} />
        </div>
      </div>
      <div id="container" className="ViewPdf_Container">
        <Document
          className="pdf"
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div style={{ marginBottom: "20px" }}>
              <Page
                className={"PDF_Page"}
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={pdfWidth}
                scale={1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                customTextRenderer={false}
                onLoadSuccess={(page) => {
                  const { width, height } = page;
                  const isLandscape = width > height;
                  if (isLandscape) {
                    if (windowWidth <= 912) {
                      setPdfWith(500);
                    } else if (windowWidth <= 1024) {
                      setPdfWith(900);
                    } else {
                      setPdfWith(1300);
                    }
                    document
                      .getElementById("container")
                      .classList.add("landscape");
                  }
                  // You can set a state or perform any action based on the orientation here
                }}
              />
            </div>
          ))}
        </Document>
      </div>
    </section>
  );
}

export default ViewPdf;
