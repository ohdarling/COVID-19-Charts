async function getData() {
  const ret = await axios('data.json');
  return ret.data;
}

function createChartConfig(data) {
  const { name, records } = data;
  const hasCity = !!data.cityList;
  const days = records.map(v => {
    return new Date(v.updateTime).toLocaleDateString('zh-CN', 'Asia/Shanghai');
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
  allProvinces = await getData();
  showProvince();
}

main();