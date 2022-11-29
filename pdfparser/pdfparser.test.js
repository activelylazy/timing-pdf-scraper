import fs from 'fs';
import { parse, splitIntoColumns, splitIntoLaps, makeLapFromItems, convertDriverItemsIntoLaps, readDriverHeader, readDriverItems, parseDriverLaps } from './pdfparser';

test('parsing porsche sprint challenge middle east', async () => {
    const document = await parseDriverLaps('./sample_data/2022-02-12-Yas Marina/Porsche Sprint Challenge Middle East - Race 1 - Laps and Sectortimes.pdf');

    expect(document.raceTitle).toBe('Porsche Sprint Challenge Middle East');
    expect(document.raceDate).toBe('12 - 13 February 2022')
    expect(document.raceTitle2).toBe('Porsche Sprint Challenge Middle East');
    expect(document.location).toBe('Yas Marina Circuit - 5281mtr.');

    expect(document.drivers[0].name).toBe('Morris Schuring');
    expect(document.drivers[0].number).toBe(1);
    expect(document.drivers[0].category).toBe('Porsche GT3');

    expect(document.drivers[0].laps[0]).toEqual({
        lapNumber: 1,
        s1: undefined,
        s1Speed: 217.7,
        s2: 47.866,
        s2Speed: 220,
        s3: 43.868,
        s3Speed: 165.1,
        speedTrap: 238.9,
        laptime: '2:00.140'
    });
    expect(document.drivers[0].laps[6]).toEqual({
        lapNumber: 7,
        s1: 24.969,
        s1Speed: 221.3,
        s2: 47.990,
        s2Speed: 224.1,
        s3: 43.738,
        s3Speed: 164.6,
        speedTrap: 231.8,
        laptime: '1:56.697'
    });

});

test('splits into columns with lap 1 sector 1 time present', () => {
    const driverItems = [...Array(9*6).keys()].map(i => ({
        text: String(i),
        x: Math.floor(i/27)*10,
    }));
    const driver = {
        columnHeaders: [
            {
                lap: { x: 0 },
            },
            {
                lap: { x: 10 },
            },
        ]
    };

    const columns = splitIntoColumns(driverItems, driver);
    
    expect(columns.length).toBe(2);
    expect(columns[0].length).toBe(9*3);
    expect(columns[1].length).toBe(9*3);
    expect(columns[0][0].text).toBe('0');
    expect(columns[0][26].text).toBe('26');
    expect(columns[1][0].text).toBe('27');
    expect(columns[1][26].text).toBe('53');
})

test('splits into columns with lap 1 sector 1 time missing', () => {
    const driverItems = [...Array(9*6).keys()].slice(1).map(i => ({
        text: String(i),
        x: Math.floor(i/27)*10,
    }));
    const driver = {
        columnHeaders: [
            {
                lap: { x: 0 },
            },
            {
                lap: { x: 10 },
            },
        ]
    };

    const columns = splitIntoColumns(driverItems, driver);
    
    expect(columns.length).toBe(2);
    expect(columns[0].length).toBe((9*3) - 1);
    expect(columns[1].length).toBe(9*3);
    expect(columns[0][0].text).toBe('1');
    expect(columns[0][25].text).toBe('26');
    expect(columns[1][0].text).toBe('27');
    expect(columns[1][26].text).toBe('53');
})

test('splits into laps', () => {
    const driverItems = [...Array(9*3).keys()].map(i => ({
            x: i % 9,
            y: Math.floor(i / 9),
            text: String(i),
        }));

    const laps = splitIntoLaps(driverItems);

    expect(laps.length).toBe(3);

    expect(laps[0]).toEqual({
        lapNumber: 0,
        s1: 1,
        s1Speed: 2,
        s2: 3,
        s2Speed: 4,
        s3: 5,
        s3Speed: 6,
        speedTrap: 7,
        laptime: '8'
    });
});

test('make lap from 9 items', () => {
    const lapItems = [...Array(9).keys()].map(i => ({
        x: i,
        y: 10,
        text: String(i),
    }));

    const lap = makeLapFromItems(lapItems);

    expect(lap).toEqual({
        lapNumber: 0,
        s1: 1,
        s1Speed: 2,
        s2: 3,
        s2Speed: 4,
        s3: 5,
        s3Speed: 6,
        speedTrap: 7,
        laptime: '8',
    });
});

test('make lap from 8 items', () => {
    const lapItems = [...Array(8).keys()].map(i => ({
        x: i,
        y: 10,
        text: String(i),
    }));

    const lap = makeLapFromItems(lapItems);

    expect(lap).toEqual({
        lapNumber: 0,
        s1: undefined,
        s1Speed: 1,
        s2: 2,
        s2Speed: 3,
        s3: 4,
        s3Speed: 5,
        speedTrap: 6,
        laptime: '7',
    });
});

test('reads driver header', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items.json'));

    const [ driver, index ] = readDriverHeader(items, 0);

    expect(index).toBe(13);
    expect(driver).toEqual({
        name: 'Daan van Kuijk',
        number: 8,
        category: 'Porsche GT3',
        columnHeaders: [
            {
                lap: { x: 1.297 },
            },
            {
                lap: { x: 18.641 },
            },
        ],
    });
});

test('reads driver items', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items.json'));

    const [ driver, index ] = readDriverHeader(items, 0);
    const [ driverItems, endIndex ] = readDriverItems(items, index);

    expect(endIndex).toBe(120);
    expect(items[endIndex].text).toBe(' Andrey Mukovoz');
});

test('converts a driver items into laps', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items.json'));

    const [ driver, index ] = readDriverHeader(items, 0);
    const [ driverItems, endIndex ] = readDriverItems(items, index);
    const laps = convertDriverItemsIntoLaps(driverItems, driver);
    
    expect(laps.length).toBe(12);
});

test('reads driver items over a page', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items_with_page_break.json'));

    const [ driver, index ] = readDriverHeader(items, 0);
    const [ driverItems, endIndex ] = readDriverItems(items, index);

    expect(endIndex).toBe(129);
    expect(items[endIndex].text).toBe(' Lucas Groeneveld');
});

test('converts driver with empty lap into laps', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_missing_lap.json'));

    const [ driver, index ] = readDriverHeader(items, 0);
    const [ driverItems, endIndex ] = readDriverItems(items, index);
    const laps = convertDriverItemsIntoLaps(driverItems, driver);

    expect(endIndex).toBe(122);
    expect(laps.length).toBe(12);
});

// next test: take page break driver items and split into columns
// column splitting does not work over a page break

test('converts a second driver items into laps', () => {
    const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items_with_page_break.json'));

    const [ driver, index ] = readDriverHeader(items, 0);
    const [ driverItems, endIndex ] = readDriverItems(items, index);
    driverItems.forEach((item, index) => {
        if (item.text == '164.1') {
            console.log(`Item is present here, index=${index}`);
        }
    });
    const laps = convertDriverItemsIntoLaps(driverItems, driver);
    
    expect(laps.length).toBe(12);
});
