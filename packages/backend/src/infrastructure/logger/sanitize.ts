const URL_PATTERN = /https?:\/\/[^\s"',}]+/g;

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Mask path segments that look like API keys (long alphanumeric strings)
    parsed.pathname = parsed.pathname.replace(
      /\/[a-zA-Z0-9_-]{16,}/g,
      '/***',
    );
    // Mask query param values
    for (const key of parsed.searchParams.keys()) {
      parsed.searchParams.set(key, '***');
    }
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}

export function sanitizeError(error: unknown): { message: string; name?: string; code?: unknown } {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const sanitized: { message: string; name: string; code?: unknown } = {
    message: error.message.replace(URL_PATTERN, (url) => maskUrl(url)),
    name: error.name,
  };

  if ('code' in error) {
    sanitized.code = (error as { code: unknown }).code;
  }

  return sanitized;
}
