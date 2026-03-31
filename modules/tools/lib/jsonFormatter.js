export function formatJsonText(input) {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, 2);
}