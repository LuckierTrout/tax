'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
}

// Convert lab() and other modern CSS colors to RGB for html2canvas compatibility
function convertModernColorsToRGB(element: HTMLElement): void {
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))];

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = getComputedStyle(htmlEl);

    // Get computed values (browser converts lab/oklch to rgb automatically)
    const color = computed.color;
    const bgColor = computed.backgroundColor;
    const borderColor = computed.borderColor;

    // Apply computed RGB values directly to inline styles
    if (color && color !== 'transparent') {
      htmlEl.style.color = color;
    }
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      htmlEl.style.backgroundColor = bgColor;
    }
    if (borderColor && borderColor !== 'transparent') {
      htmlEl.style.borderColor = borderColor;
    }
  });
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

// Export ReactFlow viewport to PDF using SVG-based approach
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
    // Get all node elements
    const nodeElements = containerElement.querySelectorAll('.react-flow__node');
    if (nodeElements.length === 0) {
      throw new Error('No nodes found to export');
    }

    // Get edge paths
    const edgePaths = containerElement.querySelectorAll('.react-flow__edge path');

    // Calculate bounds from node positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodeElements.forEach((node) => {
      const nodeEl = node as HTMLElement;
      const nodeTransform = nodeEl.style.transform;
      const nodeMatch = nodeTransform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);

      if (nodeMatch) {
        const nodeX = parseFloat(nodeMatch[1]);
        const nodeY = parseFloat(nodeMatch[2]);
        const nodeWidth = nodeEl.offsetWidth;
        const nodeHeight = nodeEl.offsetHeight;

        minX = Math.min(minX, nodeX);
        minY = Math.min(minY, nodeY);
        maxX = Math.max(maxX, nodeX + nodeWidth);
        maxY = Math.max(maxY, nodeY + nodeHeight);
      }
    });

    // Add padding
    const padding = 60;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Create SVG manually
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(contentWidth));
    svg.setAttribute('height', String(contentHeight));
    svg.setAttribute('xmlns', svgNS);

    // Add background
    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', backgroundColor);
    svg.appendChild(bg);

    // Add edges
    edgePaths.forEach((path) => {
      const pathEl = path as SVGPathElement;
      const d = pathEl.getAttribute('d');
      if (d) {
        const newPath = document.createElementNS(svgNS, 'path');
        // Adjust path coordinates
        const adjustedD = d.replace(/([ML])\s*([\d.-]+),\s*([\d.-]+)/g, (_, cmd, x, y) => {
          return `${cmd}${parseFloat(x) - minX},${parseFloat(y) - minY}`;
        });
        newPath.setAttribute('d', adjustedD);
        newPath.setAttribute('stroke', '#cbd5e1');
        newPath.setAttribute('stroke-width', '2');
        newPath.setAttribute('fill', 'none');
        svg.appendChild(newPath);
      }
    });

    // Level colors mapping
    const levelColors: Record<string, { bg: string; border: string; text: string }> = {
      pillar: { bg: '#faf5ff', border: '#c084fc', text: '#581c87' },
      narrative_theme: { bg: '#eff6ff', border: '#60a5fa', text: '#1e3a8a' },
      subject: { bg: '#f0fdf4', border: '#4ade80', text: '#14532d' },
      topic: { bg: '#fefce8', border: '#facc15', text: '#713f12' },
      subtopic: { bg: '#fff7ed', border: '#fb923c', text: '#7c2d12' },
    };

    // Add nodes
    nodeElements.forEach((node) => {
      const nodeEl = node as HTMLElement;
      const nodeTransform = nodeEl.style.transform;
      const nodeMatch = nodeTransform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);

      if (nodeMatch) {
        const nodeX = parseFloat(nodeMatch[1]) - minX;
        const nodeY = parseFloat(nodeMatch[2]) - minY;
        const nodeWidth = nodeEl.offsetWidth;
        const nodeHeight = nodeEl.offsetHeight;

        // Get level from data attribute
        const level = nodeEl.getAttribute('data-level') ||
                      nodeEl.querySelector('[data-level]')?.getAttribute('data-level') ||
                      'topic';
        const colors = levelColors[level] || levelColors.topic;

        // Create node rectangle
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', String(nodeX));
        rect.setAttribute('y', String(nodeY));
        rect.setAttribute('width', String(nodeWidth));
        rect.setAttribute('height', String(nodeHeight));
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', colors.bg);
        rect.setAttribute('stroke', colors.border);
        rect.setAttribute('stroke-width', '2');
        svg.appendChild(rect);

        // Get label text
        const labelEl = nodeEl.querySelector('.font-medium, .text-sm');
        const label = labelEl?.textContent || '';

        // Add text
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', String(nodeX + nodeWidth / 2));
        text.setAttribute('y', String(nodeY + nodeHeight / 2 + 5));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', colors.text);
        text.setAttribute('font-family', 'system-ui, sans-serif');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', '500');
        text.textContent = label.length > 25 ? label.substring(0, 22) + '...' : label;
        svg.appendChild(text);
      }
    });

    // Convert SVG to canvas
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = contentWidth * scale;
      canvas.height = contentHeight * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(svgUrl);

      // Calculate PDF dimensions
      const pdfWidth = contentWidth * 0.75;
      const pdfHeight = contentHeight * 0.75;

      // Create PDF
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      throw new Error('Failed to load SVG for PDF export');
    };

    img.src = svgUrl;
  } catch (error) {
    console.error('Error exporting ReactFlow to PDF:', error);
    throw error;
  }
}
