// Tailwind 4 runs as its own PostCSS plugin and adds vendor prefixes itself (through Lightning
// CSS), so autoprefixer is gone (tailwindcss.com/docs/upgrade-guide § Using PostCSS).
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
