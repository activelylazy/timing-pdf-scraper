import { PdfReader } from 'pdfreader';

function parse(filename) {
  const items = [];
  return new Promise((resolve) => {
    new PdfReader().parseFileItems(filename, (err, item) => {
      if (err) { /* console.error("error:", err); */ } else if (!item) resolve(items);
      else if (item.text) items.push(item);
    });
  });
}

function readDriverHeader(items, startIndex) {
  let index = startIndex;
  const driverName = items[index++].text.trim();
  const driverNumber = Number(items[index++].text.trim());
  const driverClass = items[index++].text.trim();

  // todo check these
  const c1lap = items[index++];
  if (c1lap.text !== 'lap') {
    throw new Error(`Expected lap column header but got ${JSON.stringify(c1lap)}`);
  }
  const c1s1Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c1s2Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c1s3Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c1laptimeHeader = items[index++].text; // eslint-disable-line no-unused-vars
  const c2lap = items[index++];
  if (c2lap.text !== 'lap') {
    throw new Error(`Expected lap column header but got ${JSON.stringify(c2lap)}`);
  }
  const c2s1Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c2s2Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c2s3Header = items[index++].text; // eslint-disable-line no-unused-vars
  const c2laptimeHeader = items[index++].text; // eslint-disable-line no-unused-vars

  return [{
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
      },
    ],
  }, index];
}

function readPageHeader(items, startIndex) {
  let index = startIndex;
  const eventName = items[index++].text;
  const eventDate = items[index++].text;
  const eventName2 = items[index++].text;
  const eventLocation = items[index++].text;
  const documentName = items[index++].text;
  return [{
    eventName,
    eventDate,
    eventName2,
    eventLocation,
    documentName,
  },
  index,
  ];
}

function readDriverItems(items, startIndex) {
  let index = startIndex;
  const driverItems = [];
  let driverY = items[index].y;
  while (index < items.length) {
    let nextItem = items[index];

    if (nextItem.y < driverY) {
      // page break
      driverY = nextItem.y;
      const [, updatedIndex] = readPageHeader(items, index);
      index = updatedIndex;
      nextItem = items[index];
    }

    const nextItemCode = nextItem.R[0].S;
    if (nextItemCode === -1) {
      // next driver
      break;
    } else if (nextItemCode === 2) {
      // skip
      index++;
    } else if (nextItemCode !== 51 && nextItemCode !== 52) {
      throw new Error(`Unexpected driver item code in ${JSON.stringify(nextItem)}`);
    } else {
      driverItems.push(nextItem);
      index++;
    }
  }
  return [driverItems, index];
}

function splitIntoColumns(driverItems, driver) {
  const FUDGE_FACTOR = 1;
  const col1 = [];
  const col2 = [];
  driverItems.forEach((item) => {
    if (item.x >= driver.columnHeaders[1].lap.x - FUDGE_FACTOR) {
      col2.push(item);
    } else if (item.x >= driver.columnHeaders[0].lap.x - FUDGE_FACTOR) {
      col1.push(item);
    } else {
      throw new Error(`Driver item left of first column at ${driver.columnHeaders[0].lap.x}: ${JSON.stringify(item)}`);
    }
  });
  return [col1, col2];
}

function convertLaptimeToSeconds(laptime) {
  const minutesAndSeconds = laptime.split(':');
  return Number(((Number(minutesAndSeconds[0]) * 60) + Number(minutesAndSeconds[1])).toFixed(3));
}

function makeLapFromItems(lapItems) {
  lapItems.sort((a, b) => a.x - b.x);
  if (lapItems.length === 9) {
    return {
      lapNumber: Number(lapItems[0].text),
      s1: Number(lapItems[1].text),
      s1Speed: Number(lapItems[2].text),
      s2: Number(lapItems[3].text),
      s2Speed: Number(lapItems[4].text),
      s3: Number(lapItems[5].text),
      s3Speed: Number(lapItems[6].text),
      speedTrap: Number(lapItems[7].text),
      laptime: convertLaptimeToSeconds(lapItems[8].text),
    };
  } if (lapItems.length === 8) {
    const lap = {
      lapNumber: Number(lapItems[0].text),
      s1Speed: Number(lapItems[1].text),
      s2: Number(lapItems[2].text),
      s2Speed: Number(lapItems[3].text),
      s3: Number(lapItems[4].text),
      s3Speed: Number(lapItems[5].text),
      speedTrap: Number(lapItems[6].text),
      laptime: convertLaptimeToSeconds(lapItems[7].text),
    };
    lap.s1 = Number((lap.laptime - lap.s3 - lap.s2).toFixed(3));
    return lap;
  } if (lapItems.length === 1) {
    return {
      lapNumber: Number(lapItems[0].text),
    };
  }
  throw new Error(`Cannot make lap from ${lapItems.length} items: ${JSON.stringify(lapItems, null, 2)}`);
}

function splitIntoLaps(driverItems) {
  // y values here disregard page number, could cause an issue with very long sessions where y-values collide
  const uniqueYValues = [...new Set(driverItems.map((item) => item.y))];
  uniqueYValues.sort((a, b) => a - b);
  const yValueMap = {};
  uniqueYValues.forEach((value, index) => {
    yValueMap[value] = index;
  });

  const lapItems = [...Array(uniqueYValues.length).keys()].map(() => []);
  driverItems.forEach((item) => {
    lapItems[yValueMap[item.y]].push(item);
  });

  const laps = lapItems.map((lap) => makeLapFromItems(lap));
  return laps.sort((lap1, lap2) => lap1.lapNumber - lap2.lapNumber);
}

function convertDriverItemsIntoLaps(driverItems, driver) {
  const columns = splitIntoColumns(driverItems, driver);
  if (columns.length !== 2) {
    throw new Error(`Expected 2 columns of laps but got ${columns.length}`);
  }
  const col1Laps = splitIntoLaps(columns[0]);
  const col2Laps = splitIntoLaps(columns[1]);
  if (col1Laps.length !== col2Laps.length) {
    throw new Error(`Columns have different number of laps ${col1Laps.length} and ${col2Laps.length}`);
  }

  return col1Laps.concat(col2Laps);
}

function parseDriverLaps(filename) {
  return parse(filename)
    .then((items) => {
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
        const [driver, indexAfterDriverHeader] = readDriverHeader(items, index);
        index = indexAfterDriverHeader;

        const [driverItems, indexAfterDriverItems] = readDriverItems(items, index);
        index = indexAfterDriverItems;

        driver.laps = convertDriverItemsIntoLaps(driverItems, driver);
        doc.drivers.push(driver);
        console.log(`Successfully added ${driver.name} with ${driver.laps.length} laps`);
      }

      return doc;
    });
}

function validateRace(doc) {
  doc.drivers.forEach(driver => {
    if (driver.name === undefined || driver.name === '') {
      throw new Error('Missing driver name');
    }
    if (driver.number === undefined) {
      throw new Error('Missing driver number');
    }
    if (driver.category === undefined || driver.category === '') {
      throw new Error('Missing driver category');
    }
    driver.laps.forEach((lap, index) => {
      if (lap.lapNumber !== index+1) {
        throw new Error(`Incorrect lap for driver ${driver.name} at index ${index}: ${JSON.stringify(lap)}`);
      }
    });
  });
}

export {
  parse, splitIntoColumns, splitIntoLaps, makeLapFromItems, convertDriverItemsIntoLaps,
  readDriverHeader, readDriverItems, parseDriverLaps, convertLaptimeToSeconds,
  validateRace,
};
