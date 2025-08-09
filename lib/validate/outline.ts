interface ValidationError {
  type: string;
  message: string;
  location?: string;
}

interface OutlineSection {
  h2: string;
  icerik_notu: string;
  media: string;
  kilit_bilgi: string;
  alt: Array<{
    h3: string;
    icerik_notu: string;
    hikaye_notu?: string;
  }>;
}

interface BriefOutline {
  outline: {
    h1: string;
    giris: string;
    bolumler: OutlineSection[];
  };
}

export class OutlineValidator {
  private errors: ValidationError[] = [];

  validate(outline: BriefOutline): { isValid: boolean; errors: ValidationError[] } {
    this.errors = [];
    
    this.validateParagraphLength(outline);
    this.validateFirstParagraphLinks(outline);
    this.validateHierarchy(outline);
    this.validateMediaRequirements(outline);
    this.validateLinkPolicy(outline);
    
    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  private validateParagraphLength(outline: BriefOutline) {
    // Check introduction paragraph
    const introWords = this.countWords(outline.outline.giris);
    if (introWords > 55) {
      this.errors.push({
        type: 'paragraph_length',
        message: `Introduction paragraph has ${introWords} words, exceeds 55 word limit`,
        location: 'outline.giris'
      });
    }

    // Check all content sections
    outline.outline.bolumler.forEach((section, sectionIndex) => {
      const contentWords = this.countWords(section.icerik_notu);
      if (contentWords > 55) {
        this.errors.push({
          type: 'paragraph_length',
          message: `Section ${sectionIndex + 1} content has ${contentWords} words, exceeds 55 word limit`,
          location: `outline.bolumler[${sectionIndex}].icerik_notu`
        });
      }

      const keyInfoWords = this.countWords(section.kilit_bilgi);
      if (keyInfoWords > 55) {
        this.errors.push({
          type: 'paragraph_length',
          message: `Section ${sectionIndex + 1} key info has ${keyInfoWords} words, exceeds 55 word limit`,
          location: `outline.bolumler[${sectionIndex}].kilit_bilgi`
        });
      }

      // Check subsections
      section.alt.forEach((subsection, subIndex) => {
        const subContentWords = this.countWords(subsection.icerik_notu);
        if (subContentWords > 55) {
          this.errors.push({
            type: 'paragraph_length',
            message: `Subsection ${sectionIndex + 1}.${subIndex + 1} has ${subContentWords} words, exceeds 55 word limit`,
            location: `outline.bolumler[${sectionIndex}].alt[${subIndex}].icerik_notu`
          });
        }
      });
    });
  }

  private validateFirstParagraphLinks(outline: BriefOutline) {
    const intro = outline.outline.giris;
    const hasLinks = this.containsLinks(intro);
    
    if (hasLinks) {
      this.errors.push({
        type: 'first_paragraph_links',
        message: 'First paragraph contains links, which is not allowed',
        location: 'outline.giris'
      });
    }
  }

  private validateHierarchy(outline: BriefOutline) {
    // Check that we have H1 > H2 > H3 structure (no H4 jumps)
    outline.outline.bolumler.forEach((section, sectionIndex) => {
      if (!section.h2) {
        this.errors.push({
          type: 'hierarchy',
          message: `Section ${sectionIndex + 1} missing H2 heading`,
          location: `outline.bolumler[${sectionIndex}].h2`
        });
      }

      section.alt.forEach((subsection, subIndex) => {
        if (!subsection.h3) {
          this.errors.push({
            type: 'hierarchy',
            message: `Subsection ${sectionIndex + 1}.${subIndex + 1} missing H3 heading`,
            location: `outline.bolumler[${sectionIndex}].alt[${subIndex}].h3`
          });
        }
      });
    });
  }

  private validateMediaRequirements(outline: BriefOutline) {
    outline.outline.bolumler.forEach((section, sectionIndex) => {
      if (!section.media || section.media.trim().length === 0) {
        this.errors.push({
          type: 'media_requirement',
          message: `Section ${sectionIndex + 1} (H2: ${section.h2}) missing media suggestion`,
          location: `outline.bolumler[${sectionIndex}].media`
        });
      }
    });
  }

  private validateLinkPolicy(outline: BriefOutline) {
    // Check for generic anchor text patterns
    const genericAnchors = [
      'burada', 'here', 'click here', 'read more', 'devamını oku', 
      'daha fazla', 'bu link', 'this link', 'buraya tıklayın'
    ];

    const allContent = [
      outline.outline.giris,
      ...outline.outline.bolumler.flatMap(section => [
        section.icerik_notu,
        section.kilit_bilgi,
        ...section.alt.map(sub => sub.icerik_notu)
      ])
    ].join(' ');

    genericAnchors.forEach(anchor => {
      if (allContent.toLowerCase().includes(anchor.toLowerCase())) {
        this.errors.push({
          type: 'link_policy',
          message: `Generic anchor text detected: "${anchor}"`,
          location: 'content'
        });
      }
    });
  }

  private countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private containsLinks(text: string): boolean {
    if (!text) return false;
    
    // Check for HTTP/HTTPS links
    const httpRegex = /https?:\/\/[^\s]+/i;
    
    // Check for Markdown links
    const markdownRegex = /\[([^\]]+)\]\([^)]+\)/;
    
    return httpRegex.test(text) || markdownRegex.test(text);
  }

  // Helper method to fix common issues automatically
  static autoFix(outline: BriefOutline): BriefOutline {
    const fixed = JSON.parse(JSON.stringify(outline)); // Deep clone

    // Auto-split paragraphs that are too long
    fixed.outline.giris = this.splitLongParagraph(fixed.outline.giris);
    
    fixed.outline.bolumler.forEach((section: OutlineSection) => {
      section.icerik_notu = this.splitLongParagraph(section.icerik_notu);
      section.kilit_bilgi = this.splitLongParagraph(section.kilit_bilgi);
      
      section.alt.forEach((subsection: { h3: string; icerik_notu: string; hikaye_notu?: string }) => {
        subsection.icerik_notu = this.splitLongParagraph(subsection.icerik_notu);
      });
    });

    return fixed;
  }

  private static splitLongParagraph(text: string): string {
    if (!text) return text;
    
    const words = text.split(' ');
    if (words.length <= 55) return text;
    
    // Split at sentence boundaries if possible
    const sentences = text.split(/[.!?]+/);
    let result = '';
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(' ').length;
      if (currentLength + sentenceWords > 55 && result) {
        result += '.\n\n' + sentence.trim();
        currentLength = sentenceWords;
      } else {
        result += (result ? '. ' : '') + sentence.trim();
        currentLength += sentenceWords;
      }
    }
    
    return result;
  }
}
