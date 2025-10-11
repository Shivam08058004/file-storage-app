// Use PDF.js from CDN to avoid webpack issues
declare global {
  interface Window {
    pdfjsLib: any
  }
}

const PDFJS_VERSION = '4.0.379'
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`

// Initialize PDF.js from CDN
async function initPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used in the browser')
  }
  
  // Check if already loaded
  if (window.pdfjsLib) {
    return window.pdfjsLib
  }
  
  // Load PDF.js from CDN
  const pdfjsLib = await import(/* webpackIgnore: true */ PDFJS_CDN)
  window.pdfjsLib = pdfjsLib
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
  
  return window.pdfjsLib
}

/**
 * Generate a thumbnail from a PDF file
 * @param file PDF file to generate thumbnail from
 * @returns Data URL of the thumbnail image
 */
export async function generatePdfThumbnail(file: File): Promise<string | null> {
  try {
    // Initialize PDF.js
    const pdfjs = await initPdfJs()
    
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    // Get the first page
    const page = await pdf.getPage(1)
    
    // Set up canvas for rendering
    const viewport = page.getViewport({ scale: 0.5 }) // Scale down for thumbnail
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      return null
    }
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Render the page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    } as any
    
    await page.render(renderContext).promise
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('[v0] PDF thumbnail generation error:', error)
    return null
  }
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File | string): boolean {
  if (typeof file === 'string') {
    return file.toLowerCase().endsWith('.pdf') || file === 'application/pdf'
  }
  return file.type === 'application/pdf'
}
