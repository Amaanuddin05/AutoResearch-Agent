import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatText',
  standalone: true
})
export class FormatTextPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';

    // 1. Escape HTML (basic) to prevent XSS if we are binding to innerHTML
    // Note: Angular's sanitization usually handles this, but since we are generating HTML strings manual replacement might be safer if we trust the source to be markdown only. 
    // However, if we blindly replace < and > we might break things if the text implies code. 
    // The user's text seems to be markdown-like. 
    // Let's assume the text is trusted or we rely on Angular's DomSanitizer if we use [innerHTML].
    // Actually, [innerHTML] will sanitize unsafe script tags but allow formatting tags like <b>, <strong>, <br>.
    
    let formatted = value;

    // 2. Handle Bold: **text** -> <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Handle Bullets: * at start of line
    // We handle * followed by space.
    // Replace newline + * + space with <br>• 
    formatted = formatted.replace(/\n\s*\*\s/g, '<br>&bull; ');
    // Handle start of string
    formatted = formatted.replace(/^\s*\*\s/g, '&bull; ');

    // 4. Handle remaining Newlines
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }
}
