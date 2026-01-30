'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
}

export async function exportToPDF(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'taxonomy-export',
    scale = 2,
    backgroundColor = '#ffffff',
  } = options;

  try {
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      // Ensure we capture the full element
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // Calculate dimensions for PDF
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Convert to points (72 points per inch, assuming 96 DPI for screen)
    const pdfWidth = (imgWidth / scale) * 0.75;
    const pdfHeight = (imgHeight / scale) * 0.75;

    // Create PDF with custom dimensions
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    });

    // Add the image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Download the PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

// Export ReactFlow viewport to PDF
export async function exportReactFlowToPDF(
  containerElement: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'taxonomy-export',
    scale = 2,
    backgroundColor = '#f8fafc',
  } = options;

  try {
    // Find the ReactFlow viewport element
    const viewport = containerElement.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      throw new Error('ReactFlow viewport not found');
    }

    // Get the nodes container to calculate bounds
    const nodesContainer = containerElement.querySelector('.react-flow__nodes') as HTMLElement;
    if (!nodesContainer) {
      throw new Error('ReactFlow nodes container not found');
    }

    // Get all node elements to calculate bounds
    const nodeElements = containerElement.querySelectorAll('.react-flow__node');
    if (nodeElements.length === 0) {
      throw new Error('No nodes found to export');
    }

    // Calculate the bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodeElements.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();

      // Get position relative to container
      const x = rect.left - containerRect.left;
      const y = rect.top - containerRect.top;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + rect.width);
      maxY = Math.max(maxY, y + rect.height);
    });

    // Add padding
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Create a temporary container for export
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
      position: fixed;
      left: -10000px;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      background: ${backgroundColor};
      overflow: hidden;
    `;
    document.body.appendChild(exportContainer);

    // Clone the viewport content
    const clonedViewport = viewport.cloneNode(true) as HTMLElement;

    // Get the current transform of the viewport
    const transform = viewport.style.transform;
    const transformMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);

    let currentTranslateX = 0;
    let currentTranslateY = 0;
    let currentScale = 1;

    if (transformMatch) {
      currentTranslateX = parseFloat(transformMatch[1]);
      currentTranslateY = parseFloat(transformMatch[2]);
      currentScale = parseFloat(transformMatch[3]);
    }

    // Calculate the offset needed to show all nodes
    const containerRect = containerElement.getBoundingClientRect();
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    // Apply transform to show all nodes at scale 1
    clonedViewport.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;

    exportContainer.appendChild(clonedViewport);

    // Wait for any images/styles to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture to canvas
    const canvas = await html2canvas(exportContainer, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width,
      height,
    });

    // Clean up
    document.body.removeChild(exportContainer);

    // Calculate PDF dimensions
    const pdfWidth = (canvas.width / scale) * 0.75;
    const pdfHeight = (canvas.height / scale) * 0.75;

    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting ReactFlow to PDF:', error);
    throw error;
  }
}
