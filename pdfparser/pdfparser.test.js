import fs from 'fs';
import {
  splitIntoColumns, splitIntoLaps, makeLapFromItems, convertDriverItemsIntoLaps, readDriverHeader,
  readDriverItems, convertLaptimeToSeconds, cumulativeTime, parseRaceLaps, getGapsToLeader,
} from './pdfparser';

test('parsing porsche sprint challenge middle east', async () => {
  const document = await parseRaceLaps('./sample_data/2022-02-12-Yas Marina/Porsche Sprint Challenge Middle East - Race 1 - Laps and Sectortimes.pdf');

  expect(document.raceTitle).toBe('Porsche Sprint Challenge Middle East');
  expect(document.raceDate).toBe('12 - 13 February 2022');
  expect(document.raceTitle2).toBe('Porsche Sprint Challenge Middle East');
  expect(document.location).toBe('Yas Marina Circuit - 5281mtr.');

  expect(document.drivers[0].name).toBe('Morris Schuring');
  expect(document.drivers[0].number).toBe(1);
  expect(document.drivers[0].category).toBe('Porsche GT3');

  expect(document.drivers[0].laps[0]).toEqual({
    lapNumber: 1,
    s1: 28.406,
    s1Speed: 217.7,
    s2: 47.866,
    s2Speed: 220,
    s3: 43.868,
    s3Speed: 165.1,
    speedTrap: 238.9,
    laptime: 120.140,
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
    laptime: 116.697,
  });
  expect(document.drivers[0].cumLaps[0]).toEqual({
    lapNumber: 1,
    s1: 28.406,
    s1Speed: 217.7,
    s2: 76.272,
    s2Speed: 220,
    s3: 120.14,
    s3Speed: 165.1,
    speedTrap: 238.9,
    laptime: 120.14,
  });
});

test('gaps to leader', async () => {
  const document = await parseRaceLaps('./sample_data/2022-02-12-Yas Marina/Porsche Sprint Challenge Middle East - Race 1 - Laps and Sectortimes.pdf');

  const gapsToLeader = getGapsToLeader(document);

  expect(gapsToLeader.length).toBe(17);
  expect(gapsToLeader[0].driver).toEqual('Bandar Alesayi');
  expect(gapsToLeader[0].gap).toEqual(0);
  
  expect(gapsToLeader[1].driver).toEqual('Morris Schuring');
  expect(gapsToLeader[1].gap).toEqual(0.517);

  expect(gapsToLeader[9].driver).toEqual('Alexander Malykhin');
  expect(gapsToLeader[9].gap).toEqual(18.574);

  expect(gapsToLeader[13].driver).toEqual('Saud Al Saud');
  expect(gapsToLeader[13].gap).toEqual(102.317);
});

test('splits into columns with lap 1 sector 1 time present', () => {
  const driverItems = [...Array(9 * 6).keys()].map((i) => ({
    text: String(i),
    x: Math.floor(i / 27) * 10,
  }));
  const driver = {
    columnHeaders: [
      {
        lap: { x: 0 },
      },
      {
        lap: { x: 10 },
      },
    ],
  };

  const columns = splitIntoColumns(driverItems, driver);

  expect(columns.length).toBe(2);
  expect(columns[0].length).toBe(9 * 3);
  expect(columns[1].length).toBe(9 * 3);
  expect(columns[0][0].text).toBe('0');
  expect(columns[0][26].text).toBe('26');
  expect(columns[1][0].text).toBe('27');
  expect(columns[1][26].text).toBe('53');
});

test('splits into columns with lap 1 sector 1 time missing', () => {
  const driverItems = [...Array(9 * 6).keys()].slice(1).map((i) => ({
    text: String(i),
    x: Math.floor(i / 27) * 10,
  }));
  const driver = {
    columnHeaders: [
      {
        lap: { x: 0 },
      },
      {
        lap: { x: 10 },
      },
    ],
  };

  const columns = splitIntoColumns(driverItems, driver);

  expect(columns.length).toBe(2);
  expect(columns[0].length).toBe((9 * 3) - 1);
  expect(columns[1].length).toBe(9 * 3);
  expect(columns[0][0].text).toBe('1');
  expect(columns[0][25].text).toBe('26');
  expect(columns[1][0].text).toBe('27');
  expect(columns[1][26].text).toBe('53');
});

test('splits into laps', () => {
  const labels = ['0', '1', '2', '3', '4', '5', '6', '7', '0:08.00'];
  const driverItems = [...Array(9 * 3).keys()].map((i) => ({
    x: i % 9,
    y: Math.floor(i / 9),
    text: labels[i % 9],
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
    laptime: 8,
  });
});

test('make lap from 9 items', () => {
  const labels = ['0', '1', '2', '3', '4', '5', '6', '7', '0:08.00'];
  const lapItems = [...Array(9).keys()].map((i) => ({
    x: i,
    y: 10,
    text: labels[i],
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
    laptime: 8,
  });
});

test('make lap from 8 items', () => {
  const labels = ['0', '1', '22.222', '3', '44.444', '5', '6', '1:17.777'];
  const lapItems = [...Array(8).keys()].map((i) => ({
    x: i,
    y: 10,
    text: labels[i],
  }));

  const lap = makeLapFromItems(lapItems);

  expect(lap).toEqual({
    lapNumber: 0,
    s1: 11.111,
    s1Speed: 1,
    s2: 22.222,
    s2Speed: 3,
    s3: 44.444,
    s3Speed: 5,
    speedTrap: 6,
    laptime: 77.777,
  });
});

test('reads driver header', () => {
  const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items.json'));

  const [driver, index] = readDriverHeader(items, 0);

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

  const [, index] = readDriverHeader(items, 0);
  const [, endIndex] = readDriverItems(items, index);

  expect(endIndex).toBe(120);
  expect(items[endIndex].text).toBe(' Andrey Mukovoz');
});

test('converts a driver items into laps', () => {
  const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items.json'));

  const [driver, index] = readDriverHeader(items, 0);
  const [driverItems] = readDriverItems(items, index);
  const laps = convertDriverItemsIntoLaps(driverItems, driver);

  expect(laps.length).toBe(12);
});

test('reads driver items over a page', () => {
  const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items_with_page_break.json'));

  const [, index] = readDriverHeader(items, 0);
  const [, endIndex] = readDriverItems(items, index);

  expect(endIndex).toBe(129);
  expect(items[endIndex].text).toBe(' Lucas Groeneveld');
});

test('converts driver with empty lap into laps', () => {
  const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_missing_lap.json'));

  const [driver, index] = readDriverHeader(items, 0);
  const [driverItems, endIndex] = readDriverItems(items, index);
  const laps = convertDriverItemsIntoLaps(driverItems, driver);

  expect(endIndex).toBe(122);
  expect(laps.length).toBe(11);
});

test('converts a second driver items into laps', () => {
  const items = JSON.parse(fs.readFileSync('sample_data/2022-02-12-Yas Marina/driver_items_with_page_break.json'));

  const [driver, index] = readDriverHeader(items, 0);
  const [driverItems] = readDriverItems(items, index);
  const laps = convertDriverItemsIntoLaps(driverItems, driver);

  expect(laps.length).toBe(12);
  expect(laps[0].lapNumber).toBe(1);
});

test('converts laptime to seconds', () => {
  const seconds = convertLaptimeToSeconds('1:59.787');

  expect(seconds).toBe(119.787);
});

test('converts laptime to seconds with rounding', () => {
  // this value isn't a precise float
  const seconds = convertLaptimeToSeconds('1:55.546');

  expect(seconds).toBe(115.546);
});

test('calculates cumulative time', () => {
  const laps = [
    {
      lapNumber: 1,
      s1: 10.000,
      s2: 20.000,
      s3: 30.000,
      laptime: 60.000,
    },
    {
      lapNumber: 2,
      s1: 11.000,
      s2: 21.000,
      s3: 31.000,
      laptime: 63.000,
    },
  ];
  const cumLaps = cumulativeTime(laps);
  expect(cumLaps).toEqual([
    {
      lapNumber: 1,
      s1: 10.000,
      s2: 30.000,
      s3: 60.000,
      laptime: 60.000,
    },
    {
      lapNumber: 2,
      s1: 71.000,
      s2: 92.000,
      s3: 123.000,
      laptime: 123.000,
    },
  ]);
});
