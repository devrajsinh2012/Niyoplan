// Deterministic geometric avatar generator
// Generates unique geometric patterns per user using their user ID or email as a seed

const palettes = [
  ['#6366f1', '#e0e7ff'], // Indigo
  ['#0ea5e9', '#e0f2fe'], // Sky
  ['#10b981', '#d1fae5'], // Emerald
  ['#f59e0b', '#fef3c7'], // Amber
  ['#ef4444', '#fee2e2'], // Red
  ['#8b5cf6', '#ede9fe'], // Violet
  ['#ec4899', '#fce7f3'], // Pink
  ['#14b8a6', '#ccfbf1'], // Teal
  ['#f97316', '#ffedd5'], // Orange
  ['#3b82f6', '#dbeafe'], // Blue
];

/**
 * Simple string hash function
 * @param {string} str - The string to hash
 * @returns {number} - A hash number
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a unique geometric avatar SVG
 * @param {string} seed - A unique identifier (user ID, email, etc.)
 * @returns {string} - SVG string
 */
export function generateAvatarSVG(seed) {
  const hash = hashString(seed || 'default');

  // Pick colors from palette based on hash
  const [primary, bg] = palettes[hash % palettes.length];

  // Generate a 5x5 symmetric grid (like GitHub identicons)
  const cells = Array.from({ length: 15 }, (_, i) => ((hash >> i) & 1) === 1);

  // Mirror left to right for symmetry
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const mirrorCol = col < 3 ? col : 4 - col;
      return cells[row * 3 + mirrorCol];
    })
  );

  const cellSize = 20;
  const padding = 10;
  const rects = grid.flatMap((row, r) =>
    row.map((filled, c) =>
      filled
        ? `<rect x="${c * cellSize + padding}" y="${r * cellSize + padding}" width="${cellSize}" height="${cellSize}" fill="${primary}" rx="2"/>`
        : ''
    )
  ).filter(Boolean).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="${bg}" rx="60"/>
    ${rects}
  </svg>`;
}

/**
 * Generate a data URL for the avatar
 * @param {string} seed - A unique identifier (user ID, email, etc.)
 * @returns {string} - Data URL for the SVG image
 */
export function avatarDataUrl(seed) {
  const svg = generateAvatarSVG(seed);
  // Use encodeURIComponent for better compatibility
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the primary color for a user based on their seed
 * @param {string} seed - A unique identifier
 * @returns {string} - Hex color string
 */
export function getAvatarColor(seed) {
  const hash = hashString(seed || 'default');
  return palettes[hash % palettes.length][0];
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} - Initials (max 2 chars)
 */
export function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
