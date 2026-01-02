/**
 * useMarkdown composable
 * 
 * Provides markdown parsing utilities using marked library.
 */

import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true,    // GitHub Flavored Markdown
});

export function useMarkdown() {
    function parseMarkdown(content: string): string {
        if (!content) return '';
        return marked.parse(content, { async: false }) as string;
    }

    return {
        parseMarkdown,
    };
}
