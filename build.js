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

generateConfigs();
