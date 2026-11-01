/** Chunk file lists so Windows CreateProcess does not hit the ~8191 argv limit. */
function chunk(files, size) {
  const out = [];
  for (let i = 0; i < files.length; i += size) out.push(files.slice(i, i + size));
  return out;
}

function quote(file) {
  return `"${file.replaceAll('"', '\\"')}"`;
}

export default {
  "*.{ts,tsx,js,jsx,mjs}": (files) => {
    const eslintCmds = chunk(files, 30).map(
      (group) => `eslint --fix ${group.map(quote).join(" ")}`,
    );
    const prettierCmds = chunk(files, 40).map(
      (group) => `prettier --write ${group.map(quote).join(" ")}`,
    );
    return [...eslintCmds, ...prettierCmds];
  },
  "*.{json,css,md}": (files) =>
    chunk(files, 40).map((group) => `prettier --write ${group.map(quote).join(" ")}`),
};
