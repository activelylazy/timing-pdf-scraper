import { PdfReader } from 'pdfreader';

var numberOfColumns = 9;

function parse(filename) {
    let items = [];
    return new Promise((resolve, reject) => {
        new PdfReader().parseFileItems(filename, (err, item) => {
            if (err) { /*console.error("error:", err);*/ }
            else if (!item) resolve(items);
            else if (item.text) items.push(item);
        });
    });
}

function splitIntoColumns(driverItems) {
    return [driverItems.slice(0, driverItems.length / 2), driverItems.slice(driverItems.length / 2)];
}

export { parse, splitIntoColumns };