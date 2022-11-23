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
    const yValueMap = {};
    uniqueYValues.forEach((value, index) => {
        yValueMap[value] = index;
    });

    const lapItems = [...Array(uniqueYValues.length).keys()].map(i => []);
    driverItems.forEach(item => {
        lapItems[yValueMap[item.y]].push(item);
    });
    
    return lapItems.map(lap => makeLapFromItems(lap));
}

function makeLapFromItems(lapItems) {
    lapItems.sort((a, b) => a.x - b.x);
    if (lapItems.length == 9) {
        return {
            'lapNumber': Number(lapItems[0].text),
            's1': Number(lapItems[1].text),
            's1Speed': Number(lapItems[2].text),
            's2': Number(lapItems[3].text),
            's2Speed': Number(lapItems[4].text),
            's3': Number(lapItems[5].text),
            's3Speed': Number(lapItems[6].text),
            'speedTrap': Number(lapItems[7].text),
            'laptime': lapItems[8].text,
        }
    } else if (lapItems.length == 8) {
        return {
            'lapNumber': Number(lapItems[0].text),
            's1Speed': Number(lapItems[1].text),
            's2': Number(lapItems[2].text),
            's2Speed': Number(lapItems[3].text),
            's3': Number(lapItems[4].text),
            's3Speed': Number(lapItems[5].text),
            'speedTrap': Number(lapItems[6].text),
            'laptime': lapItems[7].text,
        }
    }
    throw new Error(`Cannot make lap from ${lapItems.length} items`);
}

export { parse, splitIntoColumns, splitIntoLaps, makeLapFromItems };