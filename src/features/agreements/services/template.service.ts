import Handlebars from 'handlebars';

export class TemplateService {
  /**
   * Compiles an HTML template string with dynamic variables using Handlebars.
   * 
   * @param htmlContent The raw HTML string with {{placeholders}}
   * @param variables Dictionary of variables to inject
   * @returns Compiled HTML string
   */
  static compile(htmlContent: string, variables: Record<string, any>): string {
    const template = Handlebars.compile(htmlContent);
    return template(variables);
  }
}
