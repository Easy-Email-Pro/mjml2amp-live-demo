declare module 'mjml-browser' {
  interface MjmlError {
    message: string;
    line?: number;
  }
  interface MjmlResult {
    html: string;
    errors?: MjmlError[];
  }
  function mjml2html(
    mjml: string,
    options?: { validationLevel?: 'strict' | 'soft' | 'skip' }
  ): MjmlResult;
  export = mjml2html;
}
