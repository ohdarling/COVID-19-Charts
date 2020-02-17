let allDataStore = {};

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

const allTabs = (() => {
  return [].slice.call(document.querySelectorAll("#navbar a")).reduce((p, v) => {
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
  }

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
    const ret = await axios.get(`by_${type}.json`, {
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
  const { name, records } = data;
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
        xAxis: records[records.length - 2].updateTime,
      }, {
        xAxis: records[records.length - 1].updateTime,
      }] ]
    }
  }

  const config = {
    title: [
      {
        text: name,
        link: hasCity ? `javascript:showProvince('${name}')` : '',
        target: 'self',
      },
      {
        text: data.lastUpdate ? `最后更新时间：${new Date(data.lastUpdate).toLocaleString('zh-CN')}` : '',
        right: 20, top: 4,
        textStyle: { fontSize: 12, fontWeight: 'normal', color: '#666', },
      }
    ],
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [ '确诊', '治愈', '死亡', '治疗', '新增确诊', '新增治愈', '新增死亡' ],
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
        name: '确诊',
        data: confirmed,
        type: 'line',
      },
      {
        name: '治愈',
        data: cured,
        type: 'line',
      },
      {
        name: '死亡',
        data: dead,
        type: 'line',
      },
      {
        name: '治疗',
        data: insick,
        type: 'line',
      },
      {
        name: '新增确诊',
        data: increase,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: '新增治愈',
        data: curedIncrease,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: '新增死亡',
        data: deadIncrease,
        type: 'bar',
        yAxisIndex: 1,
        markArea,
      },
    ]
  };

  return config;
}

function createRateTrendsChartConfig(data, seriesConfig = []) {
  const { name, records } = data;
  const days = records.map(v => v.updateTime);
  const seriesKeyMap = {};
  const series = seriesConfig.map(v => {
    seriesKeyMap[v.name] = v.key;
    return Object.assign({
      name: v.name,
      data: records.map(r => r[v.key]),
      type: 'line',
      tooltip: { formatter: '{b}: {c}%' }
    }, v.config || {})
  });

  const config = {
    title: [
      {
        text: name,
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        if (params && params.length > 0) {
          return `<b>${params[0].name}<b><br />${params.map(v => {
            return (`${v.seriesName}：${v.value || '--'}`) + (seriesKeyMap[v.seriesName].indexOf('Rate') > 0 ? '%' : '')
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
      },
    ],
    series,
  };

  return config;
}

async function createMapChartConfig({ mapName, data, title = '', valueKey = 'confirmedCount' }) {
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
    })
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
      grid: hideBarChart ? [] : [{
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
                const { name, value, confirmed, dead, cured, increased } = data;
                const tip = `<b>${name}</b><br />确诊人数：${confirmed}<br />治愈人数：${cured}<br />死亡人数：${dead}<br />新增确诊：${increased}`;
                return tip;
              }
              return `<b>${name}</b><br />暂无数据`;
            },
          },
          z: 1000,
        }
      ].concat((hideBarChart ? [] : [
        {
          name: '治愈',
          color: 'rgb(64,141,39)',
        },
        {
          name: '死亡',
          color: 'gray',
        },
        {
          name: '治疗',
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
  const html = records.map((v, i) => {
    return `<div id="chart${i}" class="trends-chart"></div>`;
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
  const html = `<div id="mapchart" class="mychart" style="display:inline-block;width:100%;height:100%;"></div>`;
  container.innerHTML = html;
  const cfg = await createMapChartConfig({ mapName, data: records });
  const chart = echarts.init(document.getElementById(`mapchart`));
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

  const html = `<div id="mapchart" class="mychart" style="display:inline-block;width:100%;height:100%;"></div>`;
  container.innerHTML = html;

  const config = {
    tooltip: {
      show: true,
      trigger: 'item',
    },
    visualMap: {
      type: 'piecewise',
      pieces: getVisualPieces('city')
    },
    series: [
      {
        name: '',
        type: 'map',
        mapType: 'world',
        roam: true,
        tooltip: {
          formatter: ({ name, data }) => {
            if (data) {
              const { name, country, value, confirmed, dead, cured, increased } = data;
              const tip = `<b>${country} (${name})</b><br />确诊人数：${confirmed}<br />治愈人数：${cured}<br />死亡人数：${dead}`;
              return tip;
            }
            return `<b>${name}</b><br />暂无数据`;
          },
        },
        data: records.map(r => {
          return {
            name: r.enName,
            country: r.countryName,
            value: r.confirmedCount,
            confirmed: r.confirmedCount,
            dead: r.deadCount,
            cured: r.curedCount,
            label: {
              show: true,
            }
          };
        }),
      }
    ]
  };

  const chart = echarts.init(document.getElementById(`mapchart`));
  chart.setOption(config);

  return [ chart ];
}


async function prepareChartData(name, type = 'area') {
  showLoading();

  const dataList = await getData(type);

  allCharts.forEach(c => {
    c.clear();
    delete c;
  });

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
  let hash = '#tab=' + tab;
  Object.values(allTabs).forEach(t => {
    const newclass = "nav-link" + (t.tab == tab ? ' active' : '');
    t.el.setAttribute('class', newclass);
  })
  if (province) {
    hash += '&province=' + encodeURIComponent(province);
  }
  if (city) {
    hash += '&city=' + encodeURIComponent(city);
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
        return p.concat(zhixiashi.indexOf(v.name) > -1 ? v : v.cityList)
      }, []),
    }
  })
  allCharts = await setupMapCharts(records, document.getElementById(chartsContainerId), '', true);
  updateHash('cities-map');
}

async function showWorldMap() {
  const data = await prepareChartData('', 'country');
  allCharts = await setupWorldMapCharts(data, document.getElementById(chartsContainerId));
  updateHash('world-map');
}

async function showSummary() {
  const records = await prepareChartData('', 'overall');

  const html = new Array(records.length * 3).join(',').split(',').map((v, i) => {
    return `<div id="chart${i}" class="trends-chart"></div>`;
  }).join('');
  document.getElementById(chartsContainerId).innerHTML = html;

  allCharts = [
    ...records.map((v, i) => {
      const cfg = createTrendsChartConfig(v);
      const chart = echarts.init(document.getElementById(`chart${i}`));
      chart.setOption(cfg);
      return chart;
    }),
    ...records.map((v, i) => {
      const cfg = createRateTrendsChartConfig(v, [
        { name: '累计死亡率', key: 'deadRate', },
        { name: '新增死亡率', key: 'deadDayRate', },
        { name: '累计治愈率', key: 'curedRate', },
        { name: '新增治愈率', key: 'curedDayRate', },
      ]);
      cfg.title[0].text += '治愈/死亡率';
      const chart = echarts.init(document.getElementById(`chart${i+records.length}`));
      chart.setOption(cfg);
      return chart;
    }),
    ...[ records[0], records[0], records[0] ].map((v, i) => {
      const cfg = createRateTrendsChartConfig(v, [
        [
          { name: '累计疑似', key: 'suspectedAccum', },
          { name: '累计确诊', key: 'confirmedCount', },
          { name: '当前疑似', key: 'suspectedCount', config: { type: 'bar', }},
          { name: '新增疑似', key: 'suspectedIncreased', config: { type: 'bar', }},
        ],
        [
          { name: '疑似确诊比例', key: 'suspectedConfirmedRate', },
          // { name: '新增检测比例', key: 'suspectedDayProcessedRate', },
          // { name: '新增确诊比例', key: 'suspectedDayConfirmedRate' },
          { name: '新增疑似', key: 'suspectedIncreased', config: { type: 'line', yAxisIndex: 1 }},
          { name: '疑似检测', key: 'suspectedDayProcessed', config: { type: 'bar', yAxisIndex: 1 }},
          { name: '疑似确诊', key: 'suspectedConfirmedCount', config: { type: 'bar', yAxisIndex: 1 }},
        ],
        [
          { name: '累计重症比例', key: 'seriousRate', },
          { name: '重症死亡比例', key: 'seriousDeadRate' },
          { name: '新增重症比例', key: 'seriousDayRate' },
          { name: '累计重症', key: 'seriousCount', config: { type: 'bar', yAxisIndex: 1 }},
          { name: '新增重症', key: 'seriousIncreased', config: { type: 'bar', yAxisIndex: 1 }},
        ],
      ][i]);
      if (i === 0) {
        cfg.yAxis[0].axisLabel.formatter = '{value}';
      }
      cfg.title[0].text += [ '疑似变化', '疑似检测/确诊', '重症率' ][i];
      const chart = echarts.init(document.getElementById(`chart${i+records.length*2}`));
      chart.setOption(cfg);
      return chart;
    }),
  ];

  updateHash('summary');
}

function handleHashChanged() {
  if (typeof $ !== 'undefined' && $('#navbarSupportedContent').collapse) {
    $('#navbarSupportedContent').collapse('hide');
  }

  const defaultTab = 'summary';
  const query = new URLSearchParams(location.hash.replace(/^#/, ''));
  const tab = query.get('tab') || defaultTab;
  const province = query.get('province') || '';
  const city = query.get('city') || '';
  let title = [ document.querySelector('title').innerHTML.split(' - ')[0] ];

  const tabFuncs = {
    'summary': {
      func: showSummary,
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
    }
  };
  const func = tabFuncs[tab] || tabFuncs[defaultTab];
  func.func(province, city);
  title.push(allTabs[tab].title);
  if (func.supportProvince && province) {
    title.push(province);
  }

  document.querySelector('title').innerHTML = title.join(' - ');
}

async function main() {
  handleHashChanged();
  window.onhashchange = handleHashChanged;
}

main();