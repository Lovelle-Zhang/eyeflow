const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const landingHtml = fs.readFileSync(path.join(root, "landing", "index.html"), "utf8");
const faviconSvg = fs.readFileSync(path.join(root, "landing", "favicon.svg"), "utf8");

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected to include ${needle}`);
  }
}

function assertNotIncludes(haystack, needle, label) {
  if (haystack.includes(needle)) {
    throw new Error(`${label}: expected to remove ${needle}`);
  }
}

try {
  assertIncludes(faviconSvg, "#EAFFF6", "landing favicon uses the source app icon background");
  assertIncludes(faviconSvg, "#BDEAFF", "landing favicon uses the source app icon blue stop");
  assertIncludes(faviconSvg, "#F3EEC7", "landing favicon uses the source app icon warm stop");
  assertIncludes(faviconSvg, "#0E1C20", "landing favicon uses the source app icon visor");
  assertIncludes(faviconSvg, "#6FE7C3", "landing favicon uses the source app icon signal dot");

  assertIncludes(
    landingHtml,
    'background: url("favicon.svg") center / contain no-repeat;',
    "landing brand marks render the app icon asset"
  );
  assertNotIncludes(
    landingHtml,
    "nav .mark::before, .ma-mark::before, .ms-mark::before",
    "landing brand marks no longer draw the old black pill"
  );
  assertNotIncludes(
    landingHtml,
    "linear-gradient(150deg, #1f3937, #142224)",
    "landing brand marks no longer use the temporary dark square"
  );

  console.log("[smoke:landing] PASSED. Landing brand marks use the source EyeFlow app icon.");
} catch (error) {
  console.error("[smoke:landing] FAILED.", error.message);
  process.exitCode = 1;
}
