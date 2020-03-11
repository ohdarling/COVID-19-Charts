/* global $ axios echarts build_timestamp getTextForKey getCurrentLang */
/* exported switchMapMetrics searchArea */

let allDataStore = {};
let mapDisplayMetrics = 'accum';

const mobulesConfig = {
  'summary': {
    func: showSummary,
  },
  'zerodays': {
    func: showZeroDays,
  },
  'map': {
    func: showMap,
    supportProvince: true,
  },
  'cities-map': {
    func: showAllCitiesMap,
  },
  'world-map': {
    func: showWorldMap,
  },
  'trends': {
    func: showProvince,
    supportProvince: true,
  },
  'world-trends': {
    func: showWorldTrends,
    supportProvince: true,
    provinceKey: 'continent',
    cityKey: 'country',
  },
};

// const allDates = (() => {
//   const ret = [];
//   const day = new Date('2020-01-24T00:00:00+08:00');
//   const now = new Date();
//   while (day <= now) {
//     ret.push(day.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\/?2020\/?/, ''));
//     day.setHours(day.getHours() + 24);
//   }
//   return ret;
// })();

const allTabs = (() => {
  return [].slice.call(document.querySelectorAll('#navbar a.nav-link')).reduce((p, v) => {
    const tab = v.href.split('#')[1].split('=')[1];
    p[tab] = {
      tab,
      el: v,
      title: v.innerHTML.trim(),
    };
    return p;
  }, {});
})();

const todayStart = (() => {
  const today = new Date();
  today.setSeconds(0);
  today.setMinutes(0);
  today.setHours(0);
  today.setMinutes(480 + today.getTimezoneOffset());
  return today;
})();

let chartsContainerId = 'chart_container';
let allCharts = [];

const showLoading = (() => {
  const el = $('#' + chartsContainerId);
  let loading = null;
  return function (show = true, pe) {
    if (typeof show === 'string') {
      const progress = pe && pe.lengthComputable ? `${Math.ceil(pe.loaded/pe.total*100)}% ` : '';
      const msg = `Loading ${show} ${progress}...`;
      if (loading) {
        $('.loading-overlay-content', el.overlay).text(msg);
      } else {
        loading = el.loading({ message: msg });
      }
    } else {
      if (show) {
        loading = el.loading({ message: 'Loading ...'});
      } else {
        el.loading('stop');
        loading = null;
      }
    }
  };

})();

function getVisualPieces(type) {
  const visualPieces = type === 'country' ? [
    { min: 10000, label: '10000人及以上', color: 'rgb(143,31,25)' },
    { min: 1000, max: 9999, label: '1000-9999人', color: 'rgb(185,43,35)' },
    { min: 500, max: 999, label: '500-999人', color: 'rgb(213,86,78)' },
    { min: 100, max: 499, label: '100-499人', color: 'rgb(239,140,108)' },
    { min: 10, max: 99, label: '10-99人', color: 'rgb(248,211,166)' },
    { min: 1, max: 9, label: '1-9人', color: 'rgb(252,239,218)' },
  ] : [
    { min: 1000, label: '1000人及以上', color: 'rgb(143,31,25)' },
    { min: 500, max: 999, label: '500-999人', color: 'rgb(185,43,35)' },
    { min: 100, max: 499, label: '100-499人', color: 'rgb(213,86,78)' },
    { min: 50, max: 100, label: '50-99人', color: 'rgb(239,140,108)' },
    { min: 10, max: 49, label: '10-49人', color: 'rgb(248,211,166)' },
    { min: 1, max: 9, label: '1-9人', color: 'rgb(252,239,218)' },
  ];
  return visualPieces;
}

async function prepareChartMap(mapName) {
  let geoJSON = null;
  if (!echarts.getMap(mapName)) {
    const isProvince = [ 'china', 'china-cities', 'world' ].indexOf(mapName) === -1;
    const url = `map/json/${isProvince ? 'province/' : ''}${mapName}.json`;
    geoJSON = (await axios.get(url, {
      onDownloadProgress: (pe) => {
        showLoading('map', pe);
      }
    })).data;
    echarts.registerMap(mapName, geoJSON);
  } else {
    geoJSON = echarts.getMap(mapName).geoJson;
  }
  return geoJSON;
}

async function getData(type) {
  if (!allDataStore[type]) {
    const t = typeof build_timestamp !== 'undefined' ? parseInt(build_timestamp) || 1 : 1;
    const ret = await axios.get(`by_${type}.json?t=${t}`, {
      onDownloadProgress: (pe) => {
        if (pe.lengthComputable) {
          showLoading('data', pe);
        }
      }
    });
    allDataStore[type] = ret.data;
  }

  return allDataStore[type];
}

function shortAreaName(name) {
  return name.replace(/(区|省|市|自治区|壮|回|族|维吾尔)/g, '');
}

function createTrendsChartConfig(data) {
  const { name, enName, records } = data;
  const hasCity = !!data.cityList;
  const days = records.map(v => v.updateTime);
  const confirmed = records.map(v => v.confirmedCount);
  const increase = records.map(v => v.confirmedIncreased);
  const cured = records.map(v => v.curedCount);
  const curedIncrease = records.map(v => v.curedIncreased);
  const dead = records.map(v => v.deadCount);
  const deadIncrease = records.map(v => v.deadIncreased);
  const insick = records.map(v => v.insickCount);

  let markArea = {};
  if (new Date(data.lastUpdate) < todayStart) {
    markArea = {
      itemStyle: {
        color: '#eee',
      },
      silent: true,
      data: [ [{
        name: '未更新',
        label: {
          color: '#aaa',
        },
        xAxis: records[Math.max(records.length - 2, 0)].updateTime,
      }, {
        xAxis: records[records.length - 1].updateTime,
      }] ]
    };
  }

  const config = {
    title: [
      {
        text: getCurrentLang() === 'zh' ? name : (enName || name),
        link: hasCity ? `javascript:showProvince('${name}')` : '',
        target: 'self',
      },
      {
        text: data.lastUpdate ? `${getTextForKey('最后更新时间：')}${new Date(data.lastUpdate).toLocaleString('zh-CN')}` : '',
        right: 20, top: 4,
        textStyle: { fontSize: 12, fontWeight: 'normal', color: '#666', },
      }
    ],
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [ '确诊', '治愈', '死亡', '治疗', '新增确诊', '新增治愈', '新增死亡' ].map(k => getTextForKey(k)),
      textStyle: {
        fontSize: 11,
      },
      bottom: 0,
    },
    grid: {
      y: 50,
      y2: 70,
    },
    xAxis: {
      type: 'category',
      data: days,
    },
    yAxis: [
      {
        type: 'value',
      },
      {
        type: 'value',
        splitLine: { show: false, },
      },
    ],
    series: [
      {
        name: getTextForKey('确诊'),
        data: confirmed,
        type: 'line',
      },
      {
        name: getTextForKey('治愈'),
        data: cured,
        type: 'line',
      },
      {
        name: getTextForKey('死亡'),
        data: dead,
        type: 'line',
      },
      {
        name: getTextForKey('治疗'),
        data: insick,
        type: 'line',
      },
      {
        name: getTextForKey('新增确诊'),
        data: increase,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: getTextForKey('新增治愈'),
        data: curedIncrease,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: getTextForKey('新增死亡'),
        data: deadIncrease,
        type: 'bar',
        yAxisIndex: 1,
        markArea,
      },
    ]
  };

  return config;
}

function createRateTrendsChartConfig(data, seriesConfig = [], overrideConfig = {}) {
  const nameKey = getCurrentLang() === 'en' ? 'enName' : 'name';
  const displayName = data[nameKey] || data.name;
  const { records } = data;
  const days = records.map(v => v.updateTime);
  const seriesKeyMap = {};
  const series = seriesConfig.map(v => {
    seriesKeyMap[v.name] = v.key;
    return Object.assign({
      name: v.name,
      data: records.map(r => r[v.key]),
      type: 'line',
      tooltip: { formatter: '{b}: {c}%' }
    }, v.config || {});
  });

  const config = {
    title: [
      {
        text: displayName,
      },
    ].concat(data.lastUpdate ?
      [
        {
          text: data.lastUpdate ? `${getTextForKey('最后更新时间：')}${new Date(data.lastUpdate).toLocaleString('zh-CN')}` : '',
          right: 20, top: 4,
          textStyle: { fontSize: 12, fontWeight: 'normal', color: '#666', },
        }
      ] : []),
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        if (params && params.length > 0) {
          return `<b>${params[0].name}<b><br />${params.map(v => {
            return (`${v.seriesName}：${v.value || '--'}`) + (seriesKeyMap[v.seriesName].indexOf('Rate') > 0 ? '%' : '');
          }).join('<br />')}`;
        }
        return '';
      }
    },
    legend: {
      data: series.map(s => s.name),
      textStyle: {
        fontSize: 11,
      },
      bottom: 0,
    },
    grid: {
      y: 50,
      y2: 70,
    },
    xAxis: {
      type: 'category',
      data: days,
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
        }
      },
      {
        type: 'value',
        splitLine: { show: false },
      },
    ],
    series,
  };

  Object.keys(overrideConfig).forEach(k => {
    config[k] = Object.assign(config[k] || {}, overrideConfig[k]);
  });

  return config;
}

function switchMapMetrics(m) {
  mapDisplayMetrics = m;
  handleHashChanged();
}

async function createMapChartConfig({ mapName, data, valueKey = 'confirmedCount' }) {
  valueKey = mapDisplayMetrics === 'accum' ? 'confirmedCount' : 'insickCount';
  let geoJSON = await prepareChartMap(mapName);
  geoJSON.features.forEach(v => {
    const showName = v.properties.name;
    data.forEach(d => {
      d.records.forEach(r => {
        const name = r.name;
        if (name.substr(0, showName.length) === showName || showName.substr(0, name.length) === name) {
          r.showName = showName;
        }
      });
    });
  });

  const visualPieces = getVisualPieces(mapName === 'china' ? 'country' : 'city');

  const hideBarChart = (mapName === 'china-cities');

  const barSeriesConfig = {
    stack: '人数',
    type: 'bar',
    label: {
      position: 'inside',
      show: true,
      color: '#eee',
      formatter: ({ data }) => {
        return data[0] > 0 ? data[0] : '';
      }
    },
    barMaxWidth: 30,
  };

  const config = {
    baseOption: {
      title: {
        text: mapDisplayMetrics === 'accum' ? getTextForKey('当前显示累计确诊') : getTextForKey('当前显示现存确诊'),
        link: `javascript:switchMapMetrics("${mapDisplayMetrics === 'accum' ? 'current' : 'accum'}")`,
        target: 'self',
        bottom: '10',
        left: '10',
      },
      timeline: {
        axisType: 'category',
        // realtime: false,
        // loop: false,
        autoPlay: false,
        currentIndex: data.length - 1,
        playInterval: 1000,
        // controlStyle: {
        //     position: 'left'
        // },
        data: data.map(d => d.day),
      },
      tooltip: {
        show: true,
        trigger: 'item',
      },
      // toolbox: {
      //   show: true,
      //   orient: 'vertical',
      //   left: 'right',
      //   top: 'center',
      //   feature: {
      //     dataView: {readOnly: false},
      //     restore: {},
      //     saveAsImage: {}
      //   }
      // },
      grid: hideBarChart ? [] : [
        {
          top: 10,
          width: '100%',
          left: 10,
          containLabel: true
        }
      ],
      xAxis: hideBarChart ? [] : [
        {
          type: 'value',
          axisLine: { show: false, },
          axisTick: { show: false, },
          axisLabel: { show: false, },
          splitLine: { show: false,},
        }
      ],
      yAxis: hideBarChart ? [] : [
        {
          type: 'category',
          axisLabel: {
            show: true,
            interval: 0,
          },
          axisTick: { show: false, },
          axisLine: { show: false, },
        }
      ],
      visualMap: [
        {
          type: 'piecewise',
          pieces: visualPieces,
          left: 'auto',
          right: 30,
          bottom: 100,
          seriesIndex: 0,
        },
        // {
        //   type: 'piecewise',
        //   pieces: visualPieces,
        //   dimension: 0,
        //   show: false,
        //   seriesIndex: 1,
        // },
      ],
      series: [
        {
          name: '',
          type: 'map',
          mapType: mapName,
          label: {
            show: !hideBarChart,
          },
          left: hideBarChart ? 'center' : '30%',
          tooltip: {
            formatter: ({ name, data }) => {
              if (data) {
                const { name, /*value,*/ confirmed, dead, cured, increased } = data;
                const tip = `<b>${name}</b><br />${getTextForKey('确诊人数：')}${confirmed}<br />${getTextForKey('治愈人数：')}${cured}<br />${getTextForKey('死亡人数：')}${dead}<br />${getTextForKey('新增确诊：')}${increased}`;
                return tip;
              }
              return `<b>${name}</b><br />${getTextForKey('暂无数据')}`;
            },
          },
          z: 1000,
        }
      ].concat((hideBarChart ? [] : [
        {
          name: getTextForKey('治愈'),
          color: 'rgb(64,141,39)',
        },
        {
          name: getTextForKey('死亡'),
          color: 'gray',
        },
        {
          name: getTextForKey('治疗'),
          color: 'rgb(224,144,115)',
        }
      ].map(c => {
        return Object.assign({}, barSeriesConfig, c);
      })))
    },
    options: data.map(d => {
      d.records.sort((a ,b) => a.confirmedCount < b.confirmedCount ? -1 : 1);
      return {
        series: [
          {
            title: {
              text: d.day,
            },
            data: d.records.map(r => {
              return {
                name: r.showName,
                province: r.name,
                value: r[valueKey],
                confirmed: r.confirmedCount,
                dead: r.deadCount,
                cured: r.curedCount,
                increased: r.confirmedIncreased,
              };
            }),
          },
        ].concat(hideBarChart ? [] : [ 'cured', 'dead', 'insick' ].map(k => {
          return {
            data: d.records.map(r => {
              return [ r[k + 'Count'], r.showName || r.name ];
            })
          };
        }))
      };
    })
  };

  return config;
}

function setupTrendsCharts(records, container) {
  const cls = records.length > 1 ? 'trends-chart' : 'single-chart';
  const html = records.map((v, i) => {
    return `<div id="chart${i}" class="${cls}"></div>`;
  }).join('');
  container.innerHTML = html;

  return records.map((v, i) => {
    const cfg = createTrendsChartConfig(v);
    const chart = echarts.init(document.getElementById(`chart${i}`));
    chart.setOption(cfg);
    return chart;
  });
}

async function setupMapCharts(records, container, province = '', allCities = false) {
  const mapName = !province ? (allCities ? 'china-cities' : 'china') : {
    '安徽': 'anhui', '澳门': 'aomen', '北京': 'beijing', '重庆': 'chongqing', '福建': 'fujian', '甘肃': 'gansu', '广东': 'guangdong', '广西': 'guangxi', '贵州': 'guizhou', '海南': 'hainan', '河北': 'hebei', '黑龙江': 'heilongjiang', '河南': 'henan', '湖北': 'hubei', '湖南': 'hunan', '江苏': 'jiangsu', '江西': 'jiangxi', '吉林': 'jilin', '辽宁': 'liaoning', '内蒙古': 'neimenggu', '宁夏': 'ningxia', '青海': 'qinghai', '山东': 'shandong', '上海': 'shanghai', '山西': 'shanxi', '陕西': 'shanxi1', '四川': 'sichuan', '台湾': 'taiwan', '天津': 'tianjin', '香港': 'xianggang', '新疆': 'xinjiang', '西藏': 'xizang', '云南': 'yunnan', '浙江': 'zhejiang',
  }[shortAreaName(province)];
  const html = '<div id="mapchart" class="mychart" style="display:inline-block;width:100%;height:100%;"></div>';
  container.innerHTML = html;
  const cfg = await createMapChartConfig({ mapName, data: records });
  const chart = echarts.init(document.getElementById('mapchart'));
  chart.setOption(cfg);

  if (mapName === 'china') {
    chart.on('click', (params) => {
      showMap(params.data.province);
    });
  }

  return [ chart ];
}

async function setupWorldMapCharts(records, container) {
  await prepareChartMap('world');

  const html = '<div id="mapchart" class="mychart" style="display:inline-block;width:100%;height:100%;"></div>';
  container.innerHTML = html;

  records = records.sort((a, b) => a.confirmedCount < b.confirmedCount ? -1 : 1);

  const config = {
    tooltip: {
      show: true,
      trigger: 'item',
    },
    visualMap: {
      type: 'piecewise',
      pieces: getVisualPieces('city'),
      seriesIndex: 1,
      right: 20,
    },
    xAxis: [
      {
        type: 'value',
        axisLine: { show: false, },
        axisTick: { show: false, },
        axisLabel: { show: false, },
        splitLine: { show: false,},
      }
    ],
    yAxis: [
      {
        type: 'category',
        axisLabel: {
          show: true,
          interval: 0,
        },
        axisTick: { show: false, },
        axisLine: { show: false, },
      }
    ],
    grid: [
      {
        top: 10,
        width: '100%',
        left: 10,
        containLabel: true
      },
    ],
    series: [
      {
        type: 'bar',
        data: records.filter(r => r.countryName !== '中国').map(r => {
          return [ r.confirmedCount, getCurrentLang() === 'zh' ? r.countryName : (r.countryEnglishName || r.countryName) ];
        }),
        label: {
          position: 'inside',
          show: true,
          color: '#eee',
          formatter: ({ data }) => {
            return data[0] > 0 ? data[0] : '';
          }
        },
      },
      {
        name: '',
        type: 'map',
        mapType: 'world',
        roam: true,
        tooltip: {
          formatter: ({ name, data }) => {
            if (data) {
              const { name, country, /*value,*/ confirmed, dead, cured, /*increased*/ } = data;
              const tip = `<b>${country} (${name})</b><br />${getTextForKey('确诊人数：')}${confirmed}<br />${getTextForKey('治愈人数：')}${cured}<br />${getTextForKey('死亡人数：')}${dead}`;
              return tip;
            }
            return `<b>${name}</b><br />${getTextForKey('暂无数据')}`;
          },
        },
        data: records.map(r => {
          return {
            name: r.countryEnglishName || r.countryName,
            continent: r.continentName,
            country: r.countryName,
            value: r.confirmedCount,
            confirmed: r.confirmedCount,
            dead: r.deadCount,
            cured: r.curedCount,
            // label: {
            //   show: true,
            // }
          };
        }),
        nameMap: {
          'United States': 'United States of America',
          'United Kingdom': 'United Kiongdom',
          'Croatia': '克罗地亚',
          'Czech Rep.': '捷克',
          'Dominican Rep.': '多米尼加',
          'Bosnia and Herz.': '波黑',
        },
      },
    ]
  };

  const chart = echarts.init(document.getElementById('mapchart'));
  chart.setOption(config);

  chart.on('click', (params) => {
    if (params.data && params.data.continent && params.data.country !== '中国') {
      showWorldTrends(params.data.continent, params.data.country);
    }
  });

  return [ chart ];
}


async function prepareChartData(name, type = 'area') {
  showLoading();

  const dataList = await getData(type);

  allCharts.forEach(c => {
    c.clear();
    c.dispose();
  });
  allCharts = [];

  document.getElementById(chartsContainerId).innerHTML = 'Loading...';

  let records = dataList;
  if (name) {
    if (type === 'area') {
      records = dataList.filter(v => v.name === name)[0].cityList;
    } else {
      records = dataList.map(d => {
        return {
          day: d.day,
          records: d.records.filter(p => p.name == name)[0].cityList,
        };
      });
    }
  }
  records.forEach(v => {
    v.showName = v.name;
  });

  return records;
}

function updateHash(tab, province, city) {
  const tabConfig = mobulesConfig[tab];
  let hash = '#tab=' + tab;
  Object.values(allTabs).forEach(t => {
    $(t.el)[t.tab == tab ? 'addClass' : 'removeClass']('active');
  });
  if (province) {
    hash += `&${tabConfig.provinceKey || 'province'}=${encodeURIComponent(province)}`;
  }
  if (city) {
    hash += `&${tabConfig.cityKey || 'city'}=${encodeURIComponent(city)}`;
  }
  location.hash = hash;

  showLoading(false);
}

async function showProvince(name, city = '') {
  let records = await prepareChartData(name, 'area');
  if (name && city) {
    records = records.filter(c => c.name === city);
  }
  allCharts = setupTrendsCharts(records, document.getElementById(chartsContainerId));
  updateHash('trends', name, city);
}

async function showWorldTrends(continent = '', country = '') {
  let records = await prepareChartData(name, 'world');
  if (continent) {
    records = records.filter(r => r.continentName === continent);
  }
  if (country) {
    records = records.filter(r => r.countryName === country);
  }
  allCharts = setupTrendsCharts(records, document.getElementById(chartsContainerId));
  updateHash('world-trends', continent, country);
}

async function showMap(name) {
  const records = await prepareChartData(name, 'date');
  allCharts = await setupMapCharts(records, document.getElementById(chartsContainerId), name);
  updateHash('map', name);
}


async function showAllCitiesMap() {
  const zhixiashi = [ '北京市', '重庆市', '上海市', '天津市' ];
  const data = await prepareChartData(name, 'date');
  const records = data.map(d => {
    return {
      day: d.day,
      records: d.records.reduce((p, v) => {
        return p.concat(zhixiashi.indexOf(v.name) > -1 ? v : v.cityList);
      }, []),
    };
  });
  allCharts = await setupMapCharts(records, document.getElementById(chartsContainerId), '', true);
  updateHash('cities-map');
}

async function showWorldMap() {
  const data = await prepareChartData('', 'country');
  allCharts = await setupWorldMapCharts(data, document.getElementById(chartsContainerId));
  updateHash('world-map');
}

async function showSummary() {
  const allRecords = await prepareChartData('', 'overall');
  const records = allRecords.slice(0, 3);
  const [ lastDay ] = allRecords.slice(3);
  lastDay.records.forEach(v => {
    v.updateTime = shortAreaName(v.updateTime);
  });

  const accumRateName = [ getTextForKey('累计死亡率'), getTextForKey('累计治愈率') ];
  const accumRate = [ 'deadRate', 'curedRate' ].map((k, i) => {
    return {
      name: accumRateName[i],
      enName: accumRateName[i],
      records: records[0].records.map((v, i) => {
        return {
          updateTime: v.updateTime,
          countryRate: v[k],
          nothubeiRate: records[1].records[i][k],
          hubeiRate: records[2].records[i][k],
        };
      }),
    };
  });

  allCharts = [
    ...records.map(v => {
      const cfg = createTrendsChartConfig(v);
      return cfg;
    }),
    ...[ lastDay ].map(v => {
      v = JSON.parse(JSON.stringify(v));
      v.records.sort((a, b) => a.maxZeroIncrDays > b.maxZeroIncrDays ? -1 : 1);
      const cfg = createRateTrendsChartConfig(v, [
        { name: getTextForKey('新增确诊'), key: 'confirmedIncreased' },
        { name: getTextForKey('无新增确诊天数'), key: 'maxZeroIncrDays', config: { type: 'bar', itemStyle: { color: 'rgb(156,197,175)', }, } },
      ], {
        xAxis: {
          axisLabel: {
            interval: 0,
            rotate: 40,
          }
        },
        yAxis: [{
          type: 'value',
        }],
      });
      cfg.title[0].text += ' ' + getTextForKey('无新增确诊天数');
      return cfg;
    }),
    ...[ lastDay ].map(v => {
      const cfg = createRateTrendsChartConfig(v, [
        { name: getTextForKey('现存确诊'), key: 'insickCount', config: { type: 'bar', itemStyle: { color: 'rgb(156,197,175)', }, } },
      ], {
        xAxis: {
          axisLabel: {
            interval: 0,
            rotate: 40,
          }
        },
        yAxis: [{
          type: 'value',
        }],
      });
      cfg.title[0].text += ' ' + getTextForKey('现存确诊');
      return cfg;
    }),
    ...accumRate.map(v => {
      const cfg = createRateTrendsChartConfig(v, [
        { name: getTextForKey('全国'), key: 'countryRate', },
        { name: getTextForKey('非湖北'), key: 'nothubeiRate', },
        { name: getTextForKey('湖北省'), key: 'hubeiRate', },
      ]);
      return cfg;
    }),
    ...[ records[0], records[0], records[0] ].map((v, i) => {
      const cfg = createRateTrendsChartConfig(v, [
        [
          // { name: '累计疑似', key: 'suspectedAccum', },
          // { name: '累计确诊', key: 'confirmedCount', },
          { name: getTextForKey('当前疑似'), key: 'suspectedCount', },
          { name: getTextForKey('新增疑似'), key: 'suspectedIncreased', config: { type: 'bar', yAxisIndex: 1 }},
        ],
        [
          { name: getTextForKey('疑似确诊比例'), key: 'suspectedConfirmedRate', },
          // { name: '新增检测比例', key: 'suspectedDayProcessedRate', },
          // { name: '新增确诊比例', key: 'suspectedDayConfirmedRate' },
          { name: getTextForKey('新增疑似'), key: 'suspectedIncreased', config: { type: 'line', yAxisIndex: 1 }},
          { name: getTextForKey('疑似检测'), key: 'suspectedDayProcessed', config: { type: 'bar', yAxisIndex: 1 }},
          // { name: '疑似确诊', key: 'suspectedConfirmedCount', config: { type: 'bar', yAxisIndex: 1 }},
        ],
        [
          { name: getTextForKey('累计重症比例'), key: 'seriousRate', },
          // { name: '重症死亡比例', key: 'seriousDeadRate' },
          // { name: '新增重症比例', key: 'seriousDayRate' },
          { name: getTextForKey('累计重症'), key: 'seriousCount', config: { type: 'bar', yAxisIndex: 1, itemStyle: { color: 'rgb(156,197,175)', }, } },
          { name: getTextForKey('新增重症'), key: 'seriousIncreased', config: { type: 'bar', yAxisIndex: 1 }},
        ],
      ][i]);
      if (i === 0) {
        cfg.yAxis[0].axisLabel.formatter = '{value}';
      }
      cfg.title[0].text += ' ' + [ getTextForKey('疑似变化'), getTextForKey('疑似检测/确诊'), getTextForKey('重症率') ][i];
      return cfg;
    }),
  ];

  const html = allCharts.map((_, i) => {
    return `<div id="chart${i}" class="summary-chart"></div>`;
  }).join('');
  document.getElementById(chartsContainerId).innerHTML = html;

  allCharts = allCharts.map((cfg, i) => {
    const chart = echarts.init(document.getElementById(`chart${i}`));
    chart.setOption(cfg);
    return chart;
  });

  updateHash('summary');
}

async function showZeroDays() {
  const records = await prepareChartData('', 'increase');

  allCharts = records.map(v => {
    v.records.forEach(r => {
      r.updateTime = shortAreaName(r.updateTime);
    });
    const cfg = createRateTrendsChartConfig(v, [
      { name: getTextForKey('新增确诊'), key: 'confirmedIncreased' },
      { name: getTextForKey('无新增确诊天数'), key: 'maxZeroIncrDays', config: { type: 'bar', itemStyle: { color: 'rgb(156,197,175)', }, } },
    ], {
      xAxis: {
        axisLabel: {
          interval: 0,
          rotate: 40,
        }
      },
      yAxis: [{
        type: 'value',
      }],
    });
    // cfg.title[0].text += '无新增确诊天数';
    return cfg;
  });

  const html = allCharts.map((_, i) => {
    return `<div id="chart${i}" class="trends-chart"></div>`;
  }).join('');
  document.getElementById(chartsContainerId).innerHTML = html;

  allCharts = allCharts.map((cfg, i) => {
    const chart = echarts.init(document.getElementById(`chart${i}`));
    chart.setOption(cfg);
    return chart;
  });

  updateHash('zerodays');
}

function handleHashChanged() {
  if (typeof $ !== 'undefined' && $('#navbarSupportedContent').collapse) {
    $('#navbarSupportedContent').collapse('hide');
  }

  const defaultTab = 'summary';
  const query = new URLSearchParams(location.hash.replace(/^#/, ''));
  const tab = query.get('tab') || defaultTab;
  let title = [ document.querySelector('title').innerHTML.split(' - ')[0] ];

  const func = mobulesConfig[tab] || mobulesConfig[defaultTab];

  const province = query.get(func.provinceKey || 'province') || '';
  const city = query.get(func.cityKey || 'city') || '';

  func.func(province, city);
  title.push(allTabs[tab].title);
  if (func.supportProvince && province) {
    title.push(province);
  }

  document.querySelector('title').innerHTML = title.join(' - ');
}

async function searchArea() {
  const term = $('#searchField').val().trim().toLowerCase();
  if (term.length === 0) {
    $('#searchField').focus();
    return;
  }

  const data = await prepareChartData('', 'searchterm');
  const ret = data.filter(v => {
    return v.keywords.filter(k => {
      return k && k.toLowerCase().indexOf(term) > -1;
    }).length > 0;
  });

  if (ret.length > 0) {
    location.hash = ret[0].url + '&t=' + (new Date() * 1);
  }
}

async function main() {
  handleHashChanged();
  window.onhashchange = handleHashChanged;
}

main();