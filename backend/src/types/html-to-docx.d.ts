declare module 'html-to-docx' {
  interface DocxOptions {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    pageNumber?: boolean;
    [key: string]: unknown;
  }

  function htmlToDocx(
    html: string,
    headerHtml: string | null,
    options?: DocxOptions,
  ): Promise<Buffer>;

  export = htmlToDocx;
}
