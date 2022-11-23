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

function splitIntoLaps(driverItems) {
    const uniqueYValues = [...new Set(driverItems.map(item => item.y))];
    const yValueMap = {};
    uniqueYValues.forEach((value, index) => {
        yValueMap[value] = index;
    });
    const lapItems = [...Array(uniqueYValues.length).keys()].map(i => []);
    driverItems.forEach(item => {
        lapItems[yValueMap[item.y]].push(item);
    });
    return lapItems;
}

export { parse, splitIntoColumns, splitIntoLaps };