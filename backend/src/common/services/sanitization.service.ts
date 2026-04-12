import { Injectable } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizationService {
  private readonly allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'];
  private readonly allowedAttributes = ['href', 'title'];

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(dirty: string): string {
    if (!dirty) return '';
    
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: this.allowedTags,
      ALLOWED_ATTR: this.allowedAttributes,
    });
  }

  /**
   * Sanitize plain text - removes all HTML
   */
  sanitizePlainText(dirty: string): string {
    if (!dirty) return '';
    
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize object properties recursively
   */
  sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Sanitize string fields that might contain HTML
        if (this.isHtmlField(key)) {
          sanitized[key] = this.sanitizeHtml(value);
        } else {
          sanitized[key] = this.sanitizePlainText(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'string' 
              ? this.sanitizePlainText(item)
              : typeof item === 'object' && item !== null
                ? this.sanitizeObject(item)
                : item
          );
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isHtmlField(fieldName: string): boolean {
    const htmlFields = ['contenu', 'description', 'content', 'body', 'message'];
    return htmlFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }
}
