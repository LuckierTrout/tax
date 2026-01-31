'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
}

export type ImageExportFormat = 'pdf' | 'svg' | 'jpg' | 'png';

// Level colors mapping for SVG export
const levelColors: Record<string, { bg: string; border: string; text: string }> = {
  pillar: { bg: '#faf5ff', border: '#c084fc', text: '#581c87' },
  narrative_theme: { bg: '#eff6ff', border: '#60a5fa', text: '#1e3a8a' },
  subject: { bg: '#f0fdf4', border: '#4ade80', text: '#14532d' },
  topic: { bg: '#fefce8', border: '#facc15', text: '#713f12' },
  subtopic: { bg: '#fff7ed', border: '#fb923c', text: '#7c2d12' },
};

// Generate SVG from ReactFlow container
function generateSVG(
  containerElement: HTMLElement,
  backgroundColor: string
): { svg: SVGSVGElement; width: number; height: number } {
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

  // Create SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', String(contentWidth));
  svg.setAttribute('height', String(contentHeight));
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('viewBox', `0 0 ${contentWidth} ${contentHeight}`);

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
      newPath.setAttribute('stroke', '#94a3b8');
      newPath.setAttribute('stroke-width', '2');
      newPath.setAttribute('fill', 'none');
      svg.appendChild(newPath);
    }
  });

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
      const levelAttr = nodeEl.querySelector('[data-level]')?.getAttribute('data-level');
      const level = levelAttr || 'topic';
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
      const labelEl = nodeEl.querySelector('.font-semibold');
      const label = labelEl?.textContent || '';

      // Add text
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(nodeX + nodeWidth / 2));
      text.setAttribute('y', String(nodeY + nodeHeight / 2 + 5));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', colors.text);
      text.setAttribute('font-family', 'system-ui, sans-serif');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '600');
      text.textContent = label.length > 25 ? label.substring(0, 22) + '...' : label;
      svg.appendChild(text);
    }
  });

  return { svg, width: contentWidth, height: contentHeight };
}

// Convert SVG to canvas
async function svgToCanvas(
  svg: SVGSVGElement,
  width: number,
  height: number,
  scale: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG'));
    };

    img.src = svgUrl;
  });
}

// Download helper
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export to SVG
export async function exportReactFlowToSVG(
  containerElement: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'taxonomy-export', backgroundColor = '#f8fafc' } = options;

  try {
    const { svg } = generateSVG(containerElement, backgroundColor);
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${filename}.svg`);
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw error;
  }
}

// Export to JPG
export async function exportReactFlowToJPG(
  containerElement: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'taxonomy-export', scale = 2, backgroundColor = '#f8fafc' } = options;

  try {
    const { svg, width, height } = generateSVG(containerElement, backgroundColor);
    const canvas = await svgToCanvas(svg, width, height, scale);

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${filename}.jpg`);
      }
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('Error exporting to JPG:', error);
    throw error;
  }
}

// Export to PNG
export async function exportReactFlowToPNG(
  containerElement: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'taxonomy-export', scale = 2, backgroundColor = '#f8fafc' } = options;

  try {
    const { svg, width, height } = generateSVG(containerElement, backgroundColor);
    const canvas = await svgToCanvas(svg, width, height, scale);

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${filename}.png`);
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
}

// Export to PDF
export async function exportReactFlowToPDF(
  containerElement: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'taxonomy-export', scale = 2, backgroundColor = '#f8fafc' } = options;

  try {
    const { svg, width, height } = generateSVG(containerElement, backgroundColor);
    const canvas = await svgToCanvas(svg, width, height, scale);

    // Calculate PDF dimensions
    const pdfWidth = width * 0.75;
    const pdfHeight = height * 0.75;

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
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

// Legacy export function
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
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = (imgWidth / scale) * 0.75;
    const pdfHeight = (imgHeight / scale) * 0.75;

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}
