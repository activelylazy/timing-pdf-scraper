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
    uniqueYValues.sort((a,b) => a-b);
    const uniqueXValues = [...new Set(driverItems.map(item => item.x))];
    uniqueXValues.sort((a,b) => a-b);
    if (uniqueXValues.length != 9) {
        throw new Error(`Got ${uniqueXValues.length} unique x values: ${JSON.stringify(uniqueXValues)}`);
    }
    console.log(`UniqueXValues are ${uniqueXValues}`);
    const yValueMap = {};
    uniqueYValues.forEach((value, index) => {
        yValueMap[value] = index;
    });
    const xValueMap = {}
    xValueMap[uniqueXValues[0]] = 'lapNumber';
    xValueMap[uniqueXValues[1]] = 's1';
    xValueMap[uniqueXValues[2]] = 's1Speed';
    xValueMap[uniqueXValues[3]] = 's2';
    xValueMap[uniqueXValues[4]] = 's2Speed';
    xValueMap[uniqueXValues[5]] = 's3';
    xValueMap[uniqueXValues[6]] = 's3Speed';
    xValueMap[uniqueXValues[7]] = 'speedTrap';
    xValueMap[uniqueXValues[8]] = 'laptime';

    const lapItems = [...Array(uniqueYValues.length).keys()].map(i => ({}));
    driverItems.forEach(item => {
        const field = xValueMap[item.x];
        if (field === 'laptime') {
            lapItems[yValueMap[item.y]][field] = item.text;
        } else {
            lapItems[yValueMap[item.y]][field] = Number(item.text);
        } 
    });
    return lapItems;
}

export { parse, splitIntoColumns, splitIntoLaps };