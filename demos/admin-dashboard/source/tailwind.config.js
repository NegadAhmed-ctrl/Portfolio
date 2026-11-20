/** Design tokens: a plumbing-supplies store's stock room.
 *  ink = ledger ink / steel, paper = galvanized-grey card stock,
 *  tape = yellow floor safety tape (warnings + the one primary action),
 *  rust = out-of-stock. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1D2B3A", 2: "#3C4C5D", 3: "#6B7886", line: "#C9CFCB" },
        paper: { DEFAULT: "#ECEEEA", card: "#F8F9F6", deep: "#DFE3DE" },
        tape: { DEFAULT: "#F2C230", deep: "#D9A91A", soft: "#FBEFC4" },
        rust: { DEFAULT: "#B5432B", soft: "#F4DED7" },
        moss: { DEFAULT: "#3F6B4F", soft: "#DCE8DF" },
      },
      fontFamily: {
        display: ['"Reem Kufi"', '"IBM Plex Sans Arabic"', "sans-serif"],
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
      },
      borderRadius: { tag: "3px", box: "6px" },
      boxShadow: { lift: "0 1px 0 #C9CFCB, 0 8px 24px -12px rgba(29,43,58,.35)" },
      keyframes: {
        stamp: { "0%": { opacity: 0, transform: "scale(1.9) rotate(-14deg)" }, "60%": { opacity: 1, transform: "scale(.94) rotate(-8deg)" }, "100%": { opacity: 1, transform: "scale(1) rotate(-8deg)" } },
        slidein: { from: { transform: "translateX(-24px)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
        rise: { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
      },
      animation: { stamp: "stamp .42s cubic-bezier(.2,.9,.3,1.2) both", slidein: "slidein .22s ease-out both", rise: "rise .5s cubic-bezier(.2,.8,.2,1) both" },
    },
  },
  plugins: [],
};
