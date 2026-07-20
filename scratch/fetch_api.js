const http = require('http');

const options = {
  hostname: '10.0.0.12',
  port: 80,
  path: '/API/PlusBeta/api/items/safety-stock-items',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const r1346 = json.find(i => i.ItemCode === 'R1346');
    console.log(r1346);
  });
});
req.on('error', e => console.error(e));
req.end();
