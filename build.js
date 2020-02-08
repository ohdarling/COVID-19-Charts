const https = require('https');
const http = require('http');
const fs = require('fs');
const { parseData, processDuplicatedData, toSortedProvinceData, calcIncreasement } = require('./parse_data');
const dataFileName = 'DXYArea.csv';

function generateConfigs() {
  const csvData = fs.readFileSync(dataFileName, { encoding: 'utf8' });
  console.log('Parsing...');
  let provsData = parseData(csvData);
  console.log('Processing duplicated data...');
  provsData = processDuplicatedData(provsData);
  console.log('Sorting by confirmed count...');
  provsData = toSortedProvinceData(provsData);
  console.log('Calculating increasement...');
  provsData = calcIncreasement(provsData);
  const dataStr = JSON.stringify(provsData, null, '  ');
  fs.writeFileSync('public/data.json', dataStr);
  console.log('Done.');
  fs.unlinkSync(dataFileName);
}

generateConfigs();

// const download = function(url, dest) {
//   if (fs.existsSync(dest)) {
//     fs.unlinkSync(dest);
//   }
//   const file = fs.createWriteStream(dest);
//   http.get(url, function(response) {
//     response.pipe(file);
//     file.on('finish', function() {
//       file.close();  // close() is async, call cb after close completes.
//       console.log('get success');
//     });
//     file.on('close', () => {
//       generateConfigs();
//       process.exit(0);
//     });
//   }).on('error', function(err) { // Handle errors
//     fs.unlink(dest, () => {}); // Delete the file async. (But we don't check the result)
//     console.log('get failed', err);
//     process.exit(1);
//   });
// };

// download('https://raw.githubusercontent.com/BlankerL/DXY-2019-nCoV-Data/master/csv/DXYArea.csv', dataFileName);
