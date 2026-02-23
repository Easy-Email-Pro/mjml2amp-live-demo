import accordion from './accordion.mjml?raw';
import carousel from './carousel.mjml?raw';
import form from './form.mjml?raw';

export interface TemplateItem {
  name: string;
  content: string;
}

export const TEMPLATES: TemplateItem[] = [
  { name: 'accordion.mjml', content: accordion },
  { name: 'carousel.mjml', content: carousel },
  { name: 'form.mjml', content: form },
];
