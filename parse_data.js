const allDates = (() => {
  const ret = [];
  const day = new Date('2020-01-24T00:00:00+08:00');
  const now = new Date();
  while (day <= now) {
    ret.push(day.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\/?2020\/?/, ''));
    day.setHours(day.getHours() + 24);
  }
  return ret;
})();

function parseData(data) {
  const provinces = {};

  function createRecord(prefix, lineRecord) {
    const time = new Date(lineRecord.updateTime.replace(' ', 'T') + '+08:00');
    const lastUpdate = time.toISOString();
    const ret = { lastUpdate, updateTime: time.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\/?2020\/?/, '') };
    Object.keys(lineRecord).forEach(k => {
      if (k.split('_')[0] === prefix) {
        ret[k.split('_')[1]] = lineRecord[k];
      }
    });
    ret.insickCount = Math.max(ret.confirmedCount - ret.curedCount - ret.deadCount, 0);
    return ret;
  }

  const lines = data.split('\n');
  const headers = lines[0].split(',');
  headers[0] = 'provinceName';

  for (let i = lines.length - 1; i > 0; --i) {
    if (lines[i].trim().length === 0) {
      continue;
    }

    const lineRecord = {};
    lines[i].split(',').forEach((v, i) => {
      const field = headers[i];
      if (field.substr(field.length - 5) === 'Count') {
        v = parseInt(v, 10);
      }
      lineRecord[field] = v;
    });
    const { provinceName, cityName } = lineRecord;

    const prov = provinces[provinceName] || {
      name: provinceName,
      provinceName,
      cities: {},
      records: [],
    };
    provinces[provinceName] = prov;

    const provRec = createRecord('province', lineRecord);

    Object.assign(prov, provRec);
    prov.records.push(provRec);

    const city = prov.cities[cityName] || {
      name: cityName,
      cityName,
      records: [],
    };
    prov.cities[cityName] = city;

    const cityRec = createRecord('city', lineRecord);

    Object.assign(city, cityRec);
    city.records.push(cityRec);
  }

  return provinces;
}

function processDuplicatedData(data) {
  function filterDuplicatedData(records) {
    return records.filter((r, i) => {
      if (i === records.length - 1) {
        return true;
      }

      const a = r;
      const b = records[i + 1];
      if (a.updateTime === b.updateTime) {
        return false;
      }

      return true;
    });
  }

  Object.values(data).forEach(prov => {
    prov.records = filterDuplicatedData(prov.records);

    Object.values(prov.cities).forEach(city => {
      city.records = filterDuplicatedData(city.records);
    });
  });

  return data;
}

function addMissingRecord(data) {
  function checkRecord(day, i, list) {
    if ((list[i] || {}).updateTime !== day) {
      const rec = Object.assign({
        confirmedCount: 0,
        curedCount: 0,
        deadCount: 0,
      }, list[i - 1] || {}, {
        updateTime: day,
      });
      list.splice(i, 0, rec);
    }
  }
  data.forEach(p => {
    allDates.forEach((day, i) => {
      checkRecord(day, i, p.records);
      p.cityList.forEach(c => {
        checkRecord(day, i, c.records);
      })
    })
  })
  return data;
}

function toSortedProvinceData(data) {
  return Object.values(data).sort((a, b) => {
    return a.confirmedCount > b.confirmedCount ? -1 : 1;
  }).map(prov => {
    prov.cityList = Object.values(prov.cities).sort((a, b) => {
      return a.confirmedCount > b.confirmedCount ? -1 : 1;
    });
    return prov;
  });
}

function calcIncreasement(data) {
  function calcIncreased(r, i, list) {
    const props = [ 'confirmed', 'cured', 'dead' ];
    const prev = list[i - 1] || {};
    const cur = list[i];
    props.forEach(p => {
      r[p + 'Increased'] = Math.max(cur[p + 'Count'] - (prev[p + 'Count'] || 0), 0);
    });
  }
  data.forEach(prov => {
    prov.records.forEach((r, i) => {
      calcIncreased(r, i, prov.records);

    });
    calcIncreased(prov, prov.records.length - 1, prov.records);

    if (prov.cityList) {
      prov.cityList.forEach(city => {
        city.records.forEach((r, i) => {
          calcIncreased(r, i, city.records);
        });
        calcIncreased(city, city.records.length - 1, city.records);
      });
    }
  });

  return data;
}

function toDateSeriesData(data) {
  const ret = allDates.map(day => {
    return {
      day,
      records: data.map(p => {
        const prov = Object.assign({
          name: p.name,
          provinceName: p.name,
          confirmedCount: 0,
          curedCount: 0,
          deadCount: 0,
          updateTime: day,
        }, p.records.filter(r => r.updateTime === day)[0] || {})
        prov.cityList = p.cityList.map(c => {
          return Object.assign({
            name: c.name,
            provinceName: p.name,
            confirmedCount: 0,
            curedCount: 0,
            deadCount: 0,
            updateTime: day,
          }, c.records.filter(r => r.updateTime === day)[0] || {})
        });
        return prov;
      })
    }
  });

  calcIncreasement(ret);

  return ret;
}

function generateFromCSV(csvData) {
  console.log('Generating data from csv...');
  console.log('Parsing...');
  let provsData = parseData(csvData);
  console.log('Processing duplicated data...');
  provsData = processDuplicatedData(provsData);
  console.log('Sorting by confirmed count...');
  provsData = toSortedProvinceData(provsData);
  console.log('Add missing records...');
  provsData = addMissingRecord(provsData);
  console.log('Calculating increasement...');
  provsData = calcIncreasement(provsData);
  console.log('Finished.');
  return provsData;
}

module.exports = {
  parseData,
  processDuplicatedData,
  toSortedProvinceData,
  calcIncreasement,
  toDateSeriesData,
  generateFromCSV,
};
