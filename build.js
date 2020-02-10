const https = require('https');
const http = require('http');
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
