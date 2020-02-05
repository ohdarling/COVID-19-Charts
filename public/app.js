async function getData() {
  const ret = await axios('DXYArea.csv');
  return ret.data;
}

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
      if ((a.updateTime).toLocaleDateString() === (b.updateTime).toLocaleDateString()) {
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

function createChartConfig(data) {
  // function genChartConfig(name, records, isCity = false) {
  const { name, records } = data;
  const hasCity = !!data.cityList;
  const days = records.map(v => {
    return v.updateTime.toLocaleDateString();
  });
  const confirmed = records.map(v => v.confirmedCount);
  const increase = records.map(v => v.confirmedIncreased);
  const cured = records.map(v => v.curedCount);
  const dead = records.map(v => v.deadCount);

  const config = {
    title: {
      text: name,
      link: hasCity ? `javascript:showProvince('${name}')` : '',
      target: 'self',
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [ '确诊人数', '新增确诊', '治愈人数', '死亡人数' ],
    },
    xAxis: {
        type: 'category',
        data: days,
    },
    yAxis: {
        type: 'value'
    },
    series: [
      {
        name: '确诊人数',
        data: confirmed,
        type: 'line',
      },
      {
        name: '新增确诊',
        data: increase,
        type: 'line',
      },
      {
        name: '治愈人数',
        data: cured,
        type: 'line',
      },
      {
        name: '死亡人数',
        data: dead,
        type: 'line',
      },
    ]
  };

  return config;
}

function setuChartHTML(records, container) {
  const html = records.map((v, i) => {
    return `<div id="chart${i}" class="mychart" style="display:inline-block;width:560px;height:400px;"></div>`;
  }).join('');
  container.innerHTML = html;
}

function setupCharts(records) {
  return records.map((v, i) => {
    const cfg = createChartConfig(v);
    const chart = echarts.init(document.getElementById(`chart${i}`));
    chart.setOption(cfg);
    return chart;
  });
}

let allProvinces = [];
let chartsContainerId = 'chart_container';
let allCharts = [];

function showProvince(name) {
  allCharts.forEach(c => {
    c.clear();
    delete c;
  });
  const records = name ? allProvinces.filter(v => v.name === name)[0].cityList : allProvinces;
  setuChartHTML(records, document.getElementById(chartsContainerId));
  allCharts = setupCharts(records);
}

async function main() {
  const csvData = await getData();
  let provsData = parseData(csvData);
  provsData = processDuplicatedData(provsData);
  provsData = toSortedProvinceData(provsData);
  provsData = calcIncreasement(provsData);
  allProvinces = provsData;

  showProvince();
}

main();