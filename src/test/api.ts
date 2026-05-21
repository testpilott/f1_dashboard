/** Build a Request object for API route tests. */
export function makeApiRequest(path: string, params: Record<string, string> = {}): Request {
  const qs = new URLSearchParams(params).toString();
  return new Request(`http://localhost${path}${qs ? `?${qs}` : ""}`);
}