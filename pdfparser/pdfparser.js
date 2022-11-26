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

function parseDriverLaps(filename) {
    return parse(filename)
        .then(items => {
            const doc = {
                raceTitle: items[0].text,
                raceDate: items[1].text,
                raceTitle2: items[2].text,
                location: items[3].text,
                doc: items[4].text,
                drivers: [],
            };

            let index = 5;
            while (index < items.length) {
                let driver = {
                    name: items[index++].text.trim(),
                    number: Number(items[index++].text),
                    category: items[index++].text.trim(),
                };

                // skip over the headers - todo check them
                index += 10;

                const [ driverItems, updatedIndex ] = readDriverItems(items, index);
                index = updatedIndex;

                console.log(`Driver ${driver.name} has ${driverItems.length} items`);
                driver.laps = convertDriverItemsIntoLaps(driverItems);
                doc.drivers.push(driver);
                console.log(`Successfully added ${driver.name} with ${driver.laps.length} laps`);
            }
        
            return doc;
        });
}

function readDriverHeader(items, index) {
    let driverName = items[index++].text.trim();
    let driverNumber = Number(items[index++].text.trim());
    let driverClass = items[index++].text.trim();

    // todo check these
    let c1lap = items[index++];
    if (c1lap.text !== 'lap') {
        throw new Error(`Expected lap column header but got ${JSON.stringify(c1lap)}`);
    }
    let c1s1Header = items[index++].text;
    let c1s2Header = items[index++].text;
    let c1s3Header = items[index++].text;
    let c1laptimeHeader = items[index++].text;
    let c2lap = items[index++];
    if (c2lap.text !== 'lap') {
        throw new Error(`Expected lap column header but got ${JSON.stringify(c2lap)}`);
    }
    let c2s1Header = items[index++].text;
    let c2s2Header = items[index++].text;
    let c2s3Header = items[index++].text;
    let c2laptimeHeader = items[index++].text;
    
    return [ {
        name: driverName,
        number: driverNumber,
        category: driverClass,
        columnHeaders: [
            {
                lap: {
                    x: c1lap.x,
                },
            },
            {
                lap: {
                    x: c2lap.x,
                },
            }
        ]
    }, index ];
}

function readPageHeader(items, index) {
    const eventName = items[index++].text;
    const eventDate = items[index++].text;
    const eventName2 = items[index++].text;
    const eventLocation = items[index++].text;
    const documentName = items[index++].text;
    return [ {
        eventName,
        eventDate,
        eventName2,
        eventLocation,
        documentName,
        },
        index
        ];
}

function readDriverItems(items, index) {
    let driverItems = [];
    let driverY = items[index].y;
    while(index < items.length) {
        let nextItem = items[index];

        if (nextItem.y < driverY) {
            // page break
            driverY = nextItem.y;
            const result = readPageHeader(items, index);
            const pageHeader = result[0];
            index = result[1];
            nextItem = items[index];
        }

        const nextItemCode = nextItem.R[0].S;
        if (nextItemCode == -1) {
            // next driver
            break;
        } else if (nextItemCode == 2) {
            // skip
        } else if (nextItemCode != 51 && nextItemCode != 52) {
            throw new Error(`Unexpected driver item code in ${JSON.stringify(nextItem)}`);
        }
        driverItems.push(nextItem);
        index++;
    }
    return [ driverItems, index ];
}

function convertDriverItemsIntoLaps(driverItems) {
    const columns = splitIntoColumns(driverItems);
    if (columns.length != 2) {
        throw new Error(`Expected 2 columns of laps but got ${columns.length}`);
    }
    const col1Laps = splitIntoLaps(columns[0]);
    const col2Laps = splitIntoLaps(columns[1]);
    if (col1Laps.length !== col2Laps.length) {
        throw new Error(`Columns have different number of laps ${col1Laps.length} and ${col2Laps.length}`);
    }

    return col1Laps.concat(col2Laps);
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
    throw new Error(`Cannot make lap from ${lapItems.length} items: ${JSON.stringify(lapItems, null, 2)}`);
}

export { parse, splitIntoColumns, splitIntoLaps, makeLapFromItems, convertDriverItemsIntoLaps, readDriverHeader, readDriverItems, parseDriverLaps };
