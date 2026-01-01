// Using 'any' for the PDF document proxy to avoid deep type dependencies for this MVP.
// In a production app, we would import { PDFDocumentProxy } from 'pdfjs-dist'.

export async function extractPageText(pdfDocument: any, pageNumber: number): Promise<string> {
  if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
    return '';
  }
  
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Combine text items with spaces. 
    return textContent.items.map((item: any) => item.str).join(' ');
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    return '';
  }
}

async function renderPageToImage(pdfDocument: any, pageNumber: number): Promise<string> {
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    
    if (!context) return '';

    await page.render({ canvasContext: context, viewport }).promise;
    
    // Export as JPEG with 0.8 quality to reduce size
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Return raw base64 (strip "data:image/jpeg;base64,")
    return dataUrl.split(',')[1];
  } catch (error) {
    console.error(`Error rendering page ${pageNumber} to image:`, error);
    return '';
  }
}

export interface PageContext {
  targetText: string;
  targetImages?: string[]; // Array of base64 images
  previousContext: string;
  nextContext: string;
}

export async function getContextAwareText(pdfDocument: any, targetPageNumber: number, count: number = 1): Promise<PageContext> {
  // 1. Get Context (1 page before the range, 1 page after the range)
  const previousContext = await extractPageText(pdfDocument, targetPageNumber - 1);
  const nextContext = await extractPageText(pdfDocument, targetPageNumber + count);

  // 2. Get Target Pages
  const pageIndices = Array.from({ length: count }, (_, i) => targetPageNumber + i)
    .filter(p => p <= pdfDocument.numPages);

  const pageTexts = await Promise.all(pageIndices.map(p => extractPageText(pdfDocument, p)));
  const targetText = pageTexts.join('\n\n---\n\n');

  // 3. Fallback to Images if text is sparse across all requested pages
  let targetImages: string[] | undefined = undefined;
  
  // Logic: If average text per page is less than 50 chars, treat as image-based
  const avgTextLen = targetText.length / count;
  if (avgTextLen < 50) {
    console.log(`Pages ${targetPageNumber} to ${targetPageNumber + count - 1} seem empty of text. Rendering images...`);
    targetImages = await Promise.all(pageIndices.map(p => renderPageToImage(pdfDocument, p)));
  }

  return {
    targetText,
    targetImages,
    previousContext,
    nextContext,
  };
}
