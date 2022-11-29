const { PdfReader } = require('pdfreader');
const fs = require('fs');

if (process.argv.length <= 2) {
  throw new Error('Expected command line arguments');
}
const filename = process.argv[2];
const outputName = `${filename.substr(0, filename.lastIndexOf('.'))}.json`;

function processItems(items) {
  let json = '';
  items.forEach((item) => {
    if (json === '') {
      json += '[\n';
    } else {
      json += ',\n';
    }
    json += JSON.stringify(item, null, 2);
  });
  json += '\n]\n';
  fs.writeFileSync(outputName, json);
}

const items = [];
new PdfReader().parseFileItems(filename, (err, item) => {
  if (err) { /* console.error("error:", err); */ } else if (!item) processItems(items);
  else if (item.text) items.push(item);
});
