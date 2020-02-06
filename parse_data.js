function parseData(data) {
  const provinces = {};

  function createRecord(prefix, lineRecord) {
    const ret = { updateTime: new Date(lineRecord.updateTime.replace(' ', 'T') + '+08:00') };
    Object.keys(lineRecord).forEach(k => {
      if (k.split('_')[0] === prefix) {
        ret[k.split('_')[1]] = lineRecord[k];
      }
    });
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
      if ((a.updateTime).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) === (b.updateTime).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) {
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
  data.forEach(prov => {
    prov.records.forEach((r, i) => {
      if (i === 0) {
        r.confirmedIncreased = 0;
      } else {
        const prev = prov.records[i - 1];
        r.confirmedIncreased = r.confirmedCount - prev.confirmedCount;
      }
    });

    prov.cityList.forEach(city => {
      city.records.forEach((r, i) => {
        if (i === 0) {
          r.confirmedIncreased = 0;
        } else {
          const prev = city.records[i - 1];
          r.confirmedIncreased = r.confirmedCount - prev.confirmedCount;
        }
      });
    });
  });

  return data;
}

module.exports = {
  parseData,
  processDuplicatedData,
  toSortedProvinceData,
  calcIncreasement,
};
