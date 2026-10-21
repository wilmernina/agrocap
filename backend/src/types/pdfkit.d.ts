declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    on(event: string, listener: (...args: any[]) => void): this;
    end(): void;
    [metodo: string]: any;
  }
  export default PDFDocument;
}
