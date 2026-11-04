/**
 * Utility to extract and validate email addresses from CSV and TXT buffers or strings.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ParseResult {
  validEmails: string[];
  invalidCount: number;
  totalParsed: number;
}

export const extractEmailsFromBuffer = (buffer: Buffer, mimetype?: string, originalname?: string): ParseResult => {
  const content = buffer.toString('utf-8');
  return extractEmailsFromString(content);
};

export const extractEmailsFromString = (content: string): ParseResult => {
  // Normalize line breaks
  const lines = content.split(/\r\n|\n|\r/);
  const foundEmails = new Set<string>();
  let invalidCount = 0;
  let totalCandidates = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if line contains commas (CSV row)
    const tokens = line.split(/[,\t;]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));

    for (const token of tokens) {
      if (!token) continue;

      // Skip common CSV header row tokens
      const lower = token.toLowerCase();
      if (lower === 'email' || lower === 'email address' || lower === 'recipient' || lower === 'name') {
        continue;
      }

      totalCandidates++;

      if (EMAIL_REGEX.test(token)) {
        foundEmails.add(token.toLowerCase());
      } else {
        invalidCount++;
      }
    }
  }

  const validEmails = Array.from(foundEmails);

  return {
    validEmails,
    invalidCount,
    totalParsed: totalCandidates,
  };
};

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};
