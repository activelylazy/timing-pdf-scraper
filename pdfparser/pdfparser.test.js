import { parse, splitIntoColumns, splitIntoLaps, makeLapFromItems, convertDriverItemsIntoLaps } from './pdfparser';

test('integration test', async () => {
    const items = await parse('./sample_data/2022-02-12-Yas Marina/Porsche Sprint Challenge Middle East - Race 1 - Laps and Sectortimes.pdf');
    console.log(`read ${items.length} items`);
    for (let index = 0; index < 40; index++) {
        const item = items[index];
        console.log(JSON.stringify(item));
    }
    const raceTitle = items[0].text;
    const raceDate = items[1].text;
    const raceTitle2 = items[2].text;
    const location = items[3].text;
    const doc = items[4].text;

    let index = 5;
    let driverName = '';
    let driverItems = [];
    let driverNumber = 0;
    let driverClass = '';

    driverName = items[index++].text;
    driverNumber = items[index++].text;
    driverClass = items[index++].text;
    let c1lapText = items[index++].text;
    let c1s1Header = items[index++].text;
    let c1s2Header = items[index++].text;
    let c1s3Header = items[index++].text;
    let c1laptimeHeader = items[index++].text;
    let c2lapText = items[index++].text;
    let c2s1Header = items[index++].text;
    let c2s2Header = items[index++].text;
    let c2s3Header = items[index++].text;
    let c2laptimeHeader = items[index++].text;

    while(items[index].R[0].S != -1) {
        driverItems.push(items[index++]);
    }

    expect(raceTitle).toBe('Porsche Sprint Challenge Middle East');
    expect(raceDate).toBe('12 - 13 February 2022')
    expect(raceTitle2).toBe('Porsche Sprint Challenge Middle East');
    expect(location).toBe('Yas Marina Circuit - 5281mtr.');

    const laps = convertDriverItemsIntoLaps(driverItems);
    expect(laps.length).toBe(12);

    expect(laps[0]).toEqual({
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

    expect(laps[6]).toEqual({
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
    const driverItems = [...Array(9*6).keys()].map(i => ({text: String(i)}));

    const columns = splitIntoColumns(driverItems);
    
    expect(columns.length).toBe(2);
    expect(columns[0].length).toBe(9*3);
    expect(columns[1].length).toBe(9*3);
    expect(columns[0][0].text).toBe('0');
    expect(columns[0][26].text).toBe('26');
    expect(columns[1][0].text).toBe('27');
    expect(columns[1][26].text).toBe('53');
})

test('splits into columns with lap 1 sector 1 time missing', () => {
    const driverItems = [...Array(9*6).keys()].slice(1).map(i => ({text: String(i)}));

    const columns = splitIntoColumns(driverItems);
    
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


