const fs = require('fs');
const { generateFromCSV, toDateSeriesData } = require('./parse_data');
const dataFileName = 'DXYArea.csv';

function generateConfigs() {
  const csvData = fs.readFileSync(dataFileName, { encoding: 'utf8' });
  const provsData = generateFromCSV(csvData);

  const dataStr = JSON.stringify(provsData, null, '  ');
  fs.writeFileSync('public/by_area.json', dataStr);

  const byDate = toDateSeriesData(provsData);
  fs.writeFileSync('public/by_date.json', JSON.stringify(byDate, null, '  '));

  console.log('Done.');
}

function generateWorldData() {
  const enMap = {"中国":"China","日本":"Japan","德国":"German","斯里兰卡":"Sri Lanka","瑞典":"Sweden","新加坡":"Singapore","泰国":"Thailand","澳大利亚":"Australia","俄罗斯":"Russia","马来西亚":"Malaysia","意大利":"Italy","比利时":"Belgium","印度":"India","英国":"United Kingdom","菲律宾":"Philippiness","阿联酋":"United Arab Emirates","美国":"United States","韩国":"Korea","越南":"Vietnam","西班牙":"Spain","加拿大":"Canada","柬埔寨":"Cambodia","尼泊尔":"Nepal","芬兰":"Finland","法国":"France"}
  const countryData = Object.values(require('./DXYArea.json').results.reduce((p, v) => {
    if (p[v.country]) {
      const c = p[v.country];
      const keys = [ 'confirmed', 'cured', 'dead', 'suspected' ];
      keys.forEach(k => {
        k = k + 'Count';
        c[k] = (c[k] || 0) + (v[k] || 0);
      });
    } else {
      p[v.country] = v;
    }
    delete v.cities;
    const c = p[v.country];
    v.updateDate = new Date(v.updateTime > c.updateTime ? v.updateTime : c.updateTime).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\/?2020\/?/, '');
    return p;
  }, {})).map(v => {
    v.updateTime = v.updateDate;
    v.enName = enMap[v.country] || '';
    return v;
  });

  fs.writeFileSync('public/by_country.json', JSON.stringify(countryData, null, '  '));
}

generateConfigs();
generateWorldData();
