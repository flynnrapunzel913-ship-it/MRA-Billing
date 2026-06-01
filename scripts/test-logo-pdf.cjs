const fs = require("fs");
const path = require("path");
const React = require("react");
const { renderToBuffer, Document, Page, View, Image, Text } = require("@react-pdf/renderer");

const root = path.join(__dirname, "..");
const logo = path.join(root, "public", "branding", "logo.png");
const out = path.join(__dirname, "logo-test-result.txt");
const lines = [];

lines.push(`logo exists: ${fs.existsSync(logo)} size: ${fs.existsSync(logo) ? fs.statSync(logo).size : 0}`);

async function test(name, src) {
  try {
    const pdf = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4" },
          React.createElement(
            View,
            { style: { padding: 30, backgroundColor: "#f0f0f0" } },
            React.createElement(Text, null, name),
            React.createElement(Image, {
              src,
              style: { width: 180, height: 72 },
              cache: false,
            })
          )
        )
      )
    );
    fs.writeFileSync(path.join(__dirname, `out-${name}.pdf`), pdf);
    lines.push(`${name}: OK ${pdf.length} bytes`);
  } catch (e) {
    lines.push(`${name}: ERR ${e.message}`);
  }
}

(async () => {
  const buf = fs.readFileSync(logo);
  await test("path", logo.split(path.sep).join("/"));
  await test("datauri-png", `data:image/png;base64,${buf.toString("base64")}`);

  try {
    const { PNG } = require("pngjs");
    const jpeg = require("jpeg-js");
    const png = PNG.sync.read(buf);
    const encoded = jpeg.encode({ data: png.data, width: png.width, height: png.height }, 92);
    const jpegBuf = Buffer.from(encoded.data);
    fs.writeFileSync(path.join(root, "public", "branding", "logo.jpg"), jpegBuf);
    await test("datauri-jpeg", `data:image/jpeg;base64,${jpegBuf.toString("base64")}`);
    await test("buffer-jpeg", { data: jpegBuf, format: "jpg" });
    lines.push(`logo.jpg written: ${jpegBuf.length} bytes`);
  } catch (e) {
    lines.push(`jpeg convert: ${e.message}`);
  }

  await test("buffer-png", { data: buf, format: "png" });
  fs.writeFileSync(out, lines.join("\n"));
})();
