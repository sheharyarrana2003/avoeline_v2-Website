/** Chunk file lists so Windows CreateProcess does not hit the ~8191 argv limit.
 * ESLint stays in CI (soft gate); pre-commit formats only — large legacy `any`
 * debt otherwise blocks deploys on Windows.
 */
function chunk(files, size) {
  const out = [];
  for (let i = 0; i < files.length; i += size) out.push(files.slice(i, i + size));
  return out;
}

function quote(file) {
  return `"${file.replaceAll('"', '\\"')}"`;
}

export default {
  "*.{ts,tsx,js,jsx,mjs,json,css,md}": (files) =>
    chunk(files, 40).map((group) => `prettier --write ${group.map(quote).join(" ")}`),
};
