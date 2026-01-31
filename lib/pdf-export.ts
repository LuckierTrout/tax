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
const levelColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pillar: { bg: '#faf5ff', border: '#c084fc', text: '#581c87', dot: '#a855f7' },
  narrative_theme: { bg: '#eff6ff', border: '#60a5fa', text: '#1e3a8a', dot: '#3b82f6' },
  subject: { bg: '#f0fdf4', border: '#4ade80', text: '#14532d', dot: '#22c55e' },
  topic: { bg: '#fefce8', border: '#facc15', text: '#713f12', dot: '#eab308' },
  subtopic: { bg: '#fff7ed', border: '#fb923c', text: '#7c2d12', dot: '#f97316' },
};

// Generate a smoothstep path between two points (like ReactFlow)
function generateSmoothstepPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const midY = (sourceY + targetY) / 2;
  const borderRadius = 8;

  // Simple case: straight down
  if (Math.abs(sourceX - targetX) < 1) {
    return `M${sourceX},${sourceY} L${targetX},${targetY}`;
  }

  // Calculate the path with rounded corners
  const goingRight = targetX > sourceX;
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(midY - sourceY);
  const radius = Math.min(borderRadius, dx / 2, dy / 2);

  if (radius < 1) {
    // Too small for curves, use straight lines
    return `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`;
  }

  // Build path with rounded corners
  let path = `M${sourceX},${sourceY}`;

  // First vertical segment
  path += ` L${sourceX},${midY - radius}`;

  // First curve
  if (goingRight) {
    path += ` Q${sourceX},${midY} ${sourceX + radius},${midY}`;
  } else {
    path += ` Q${sourceX},${midY} ${sourceX - radius},${midY}`;
  }

  // Horizontal segment
  if (goingRight) {
    path += ` L${targetX - radius},${midY}`;
  } else {
    path += ` L${targetX + radius},${midY}`;
  }

  // Second curve
  if (goingRight) {
    path += ` Q${targetX},${midY} ${targetX},${midY + radius}`;
  } else {
    path += ` Q${targetX},${midY} ${targetX},${midY + radius}`;
  }

  // Final vertical segment
  path += ` L${targetX},${targetY}`;

  return path;
}

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

  // Build node position map
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  // Calculate bounds from node positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  nodeElements.forEach((node) => {
    const nodeEl = node as HTMLElement;
    const nodeId = nodeEl.getAttribute('data-id');
    const nodeTransform = nodeEl.style.transform;
    const nodeMatch = nodeTransform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);

    if (nodeMatch && nodeId) {
      const nodeX = parseFloat(nodeMatch[1]);
      const nodeY = parseFloat(nodeMatch[2]);
      const nodeWidth = nodeEl.offsetWidth;
      const nodeHeight = nodeEl.offsetHeight;

      nodePositions.set(nodeId, { x: nodeX, y: nodeY, width: nodeWidth, height: nodeHeight });

      minX = Math.min(minX, nodeX);
      minY = Math.min(minY, nodeY);
      maxX = Math.max(maxX, nodeX + nodeWidth);
      maxY = Math.max(maxY, nodeY + nodeHeight);
    }
  });

  // Get edge connections from edge elements
  const edgeElements = containerElement.querySelectorAll('.react-flow__edge');
  const edges: Array<{ source: string; target: string }> = [];
  const seenEdges = new Set<string>();

  edgeElements.forEach((edge) => {
    const edgeId = edge.getAttribute('data-id');
    if (edgeId && !seenEdges.has(edgeId)) {
      seenEdges.add(edgeId);
      // Edge IDs are typically in format "source-target" or similar
      // Try to extract from aria-label or data attributes
      const ariaLabel = edge.getAttribute('aria-label');
      if (ariaLabel) {
        // Format: "Edge from nodeA to nodeB"
        const match = ariaLabel.match(/Edge from (.+) to (.+)/);
        if (match) {
          edges.push({ source: match[1], target: match[2] });
        }
      }
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

  // Add edges based on node positions
  edges.forEach(({ source, target }) => {
    const sourcePos = nodePositions.get(source);
    const targetPos = nodePositions.get(target);

    if (sourcePos && targetPos) {
      // Calculate connection points (bottom center of source, top center of target)
      const sourceX = sourcePos.x + sourcePos.width / 2 - minX;
      const sourceY = sourcePos.y + sourcePos.height - minY; // bottom of source
      const targetX = targetPos.x + targetPos.width / 2 - minX;
      const targetY = targetPos.y - minY; // top of target

      const pathD = generateSmoothstepPath(sourceX, sourceY, targetX, targetY);

      const newPath = document.createElementNS(svgNS, 'path');
      newPath.setAttribute('d', pathD);
      newPath.setAttribute('stroke', '#94a3b8');
      newPath.setAttribute('stroke-width', '2');
      newPath.setAttribute('fill', 'none');
      svg.appendChild(newPath);
    }
  });

  // Add nodes
  nodeElements.forEach((node) => {
    const nodeEl = node as HTMLElement;
    const nodeId = nodeEl.getAttribute('data-id');
    const pos = nodeId ? nodePositions.get(nodeId) : null;

    if (pos) {
      const nodeX = pos.x - minX;
      const nodeY = pos.y - minY;
      const nodeWidth = pos.width;
      const nodeHeight = pos.height;

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

      let currentY = nodeY + 16;

      // Get and render level label (small uppercase text at top)
      const levelLabelEl = nodeEl.querySelector('.text-\\[10px\\].uppercase');
      if (levelLabelEl?.textContent) {
        const levelText = document.createElementNS(svgNS, 'text');
        levelText.setAttribute('x', String(nodeX + nodeWidth / 2));
        levelText.setAttribute('y', String(currentY));
        levelText.setAttribute('text-anchor', 'middle');
        levelText.setAttribute('fill', '#9ca3af');
        levelText.setAttribute('font-family', 'system-ui, sans-serif');
        levelText.setAttribute('font-size', '10');
        levelText.setAttribute('letter-spacing', '0.05em');
        levelText.textContent = levelLabelEl.textContent;
        svg.appendChild(levelText);
        currentY += 16;
      }

      // Get and render colored dot + node name
      const dotEl = nodeEl.querySelector('.w-2.h-2.rounded-full') as HTMLElement;
      const labelEl = nodeEl.querySelector('.font-semibold');
      const label = labelEl?.textContent || '';

      if (dotEl) {
        const dotColor = dotEl.style.backgroundColor || colors.dot;
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', String(nodeX + nodeWidth / 2 - (label.length * 3) - 8));
        dot.setAttribute('cy', String(currentY - 3));
        dot.setAttribute('r', '4');
        dot.setAttribute('fill', dotColor);
        svg.appendChild(dot);
      }

      const nameText = document.createElementNS(svgNS, 'text');
      nameText.setAttribute('x', String(nodeX + nodeWidth / 2));
      nameText.setAttribute('y', String(currentY));
      nameText.setAttribute('text-anchor', 'middle');
      nameText.setAttribute('fill', colors.text);
      nameText.setAttribute('font-family', 'system-ui, sans-serif');
      nameText.setAttribute('font-size', '14');
      nameText.setAttribute('font-weight', '600');
      const displayLabel = label.length > 20 ? label.substring(0, 17) + '...' : label;
      nameText.textContent = displayLabel;
      svg.appendChild(nameText);
      currentY += 8;

      // Get and render objective text
      const objectiveEl = nodeEl.querySelector('.line-clamp-3');
      if (objectiveEl?.textContent) {
        currentY += 12; // Add border-t spacing

        // Draw separator line
        const sepLine = document.createElementNS(svgNS, 'line');
        sepLine.setAttribute('x1', String(nodeX + 8));
        sepLine.setAttribute('y1', String(currentY - 6));
        sepLine.setAttribute('x2', String(nodeX + nodeWidth - 8));
        sepLine.setAttribute('y2', String(currentY - 6));
        sepLine.setAttribute('stroke', '#e5e7eb');
        sepLine.setAttribute('stroke-width', '1');
        svg.appendChild(sepLine);

        const objectiveText = objectiveEl.textContent;
        const maxCharsPerLine = Math.floor((nodeWidth - 16) / 5);
        const lines = wrapText(objectiveText, maxCharsPerLine, 3);

        lines.forEach((line) => {
          const objText = document.createElementNS(svgNS, 'text');
          objText.setAttribute('x', String(nodeX + 8));
          objText.setAttribute('y', String(currentY));
          objText.setAttribute('fill', '#6b7280');
          objText.setAttribute('font-family', 'system-ui, sans-serif');
          objText.setAttribute('font-size', '10');
          objText.textContent = line;
          svg.appendChild(objText);
          currentY += 12;
        });
      }

      // Get and render audience pills
      const audiencePills = nodeEl.querySelectorAll('.flex.flex-wrap.gap-1:first-of-type span');
      if (audiencePills.length > 0) {
        currentY += 8;

        // Draw separator line
        const sepLine = document.createElementNS(svgNS, 'line');
        sepLine.setAttribute('x1', String(nodeX + 8));
        sepLine.setAttribute('y1', String(currentY - 4));
        sepLine.setAttribute('x2', String(nodeX + nodeWidth - 8));
        sepLine.setAttribute('y2', String(currentY - 4));
        sepLine.setAttribute('stroke', '#e5e7eb');
        sepLine.setAttribute('stroke-width', '1');
        svg.appendChild(sepLine);

        let pillX = nodeX + 8;
        audiencePills.forEach((pill) => {
          const pillEl = pill as HTMLElement;
          const pillText = pillEl.textContent || '';
          const pillWidth = pillText.length * 5 + 12;
          const pillBg = pillEl.style.backgroundColor || '#dbeafe';
          const pillColor = pillEl.style.color || '#1e40af';

          if (pillX + pillWidth > nodeX + nodeWidth - 8) {
            pillX = nodeX + 8;
            currentY += 14;
          }

          const pillRect = document.createElementNS(svgNS, 'rect');
          pillRect.setAttribute('x', String(pillX));
          pillRect.setAttribute('y', String(currentY - 8));
          pillRect.setAttribute('width', String(pillWidth));
          pillRect.setAttribute('height', '12');
          pillRect.setAttribute('rx', '3');
          pillRect.setAttribute('fill', pillBg);
          svg.appendChild(pillRect);

          const pillTextEl = document.createElementNS(svgNS, 'text');
          pillTextEl.setAttribute('x', String(pillX + pillWidth / 2));
          pillTextEl.setAttribute('y', String(currentY));
          pillTextEl.setAttribute('text-anchor', 'middle');
          pillTextEl.setAttribute('fill', pillColor);
          pillTextEl.setAttribute('font-family', 'system-ui, sans-serif');
          pillTextEl.setAttribute('font-size', '8');
          pillTextEl.setAttribute('font-weight', '500');
          pillTextEl.textContent = pillText;
          svg.appendChild(pillTextEl);

          pillX += pillWidth + 4;
        });
        currentY += 6;
      }

      // Get and render geography pills
      const allPillContainers = nodeEl.querySelectorAll('.flex.flex-wrap.gap-1');
      const geographyContainer = allPillContainers.length > 1 ? allPillContainers[allPillContainers.length - 1] : null;
      const geographyPills = geographyContainer?.querySelectorAll('span') || [];

      if (geographyPills.length > 0 && geographyContainer !== allPillContainers[0]) {
        currentY += 8;

        let pillX = nodeX + 8;
        geographyPills.forEach((pill) => {
          const pillEl = pill as HTMLElement;
          const pillText = pillEl.textContent || '';
          const pillWidth = pillText.length * 5 + 12;
          const pillBg = pillEl.style.backgroundColor || '#dcfce7';
          const pillColor = pillEl.style.color || '#166534';

          if (pillX + pillWidth > nodeX + nodeWidth - 8) {
            pillX = nodeX + 8;
            currentY += 14;
          }

          const pillRect = document.createElementNS(svgNS, 'rect');
          pillRect.setAttribute('x', String(pillX));
          pillRect.setAttribute('y', String(currentY - 8));
          pillRect.setAttribute('width', String(pillWidth));
          pillRect.setAttribute('height', '12');
          pillRect.setAttribute('rx', '3');
          pillRect.setAttribute('fill', pillBg);
          svg.appendChild(pillRect);

          const pillTextEl = document.createElementNS(svgNS, 'text');
          pillTextEl.setAttribute('x', String(pillX + pillWidth / 2));
          pillTextEl.setAttribute('y', String(currentY));
          pillTextEl.setAttribute('text-anchor', 'middle');
          pillTextEl.setAttribute('fill', pillColor);
          pillTextEl.setAttribute('font-family', 'system-ui, sans-serif');
          pillTextEl.setAttribute('font-size', '8');
          pillTextEl.setAttribute('font-weight', '500');
          pillTextEl.textContent = pillText;
          svg.appendChild(pillTextEl);

          pillX += pillWidth + 4;
        });
      }
    }
  });

  return { svg, width: contentWidth, height: contentHeight };
}

// Helper function to wrap text into lines
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (lines.length >= maxLines) break;

    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine && lines.length < maxLines) {
    if (lines.length === maxLines - 1 && words.length > lines.join(' ').split(' ').length + currentLine.split(' ').length) {
      lines.push(currentLine.substring(0, maxCharsPerLine - 3) + '...');
    } else {
      lines.push(currentLine);
    }
  }

  return lines;
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
