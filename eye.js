const _ = require('lodash');
const http = require('http');
const querystring = require('querystring');

module.exports = (n3Data, n3Query, callback) => {

  const postData = querystring.stringify({
    data: n3Data, query: n3Query
  });

  const options = {
    hostname: 'eye.restdesc.org',
    port: 80,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  var responseBody = "";
  const req = http.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    res.on('end', () => {
      callback(null, responseBody);
    });
  });

  req.on('error', (e) => {
    callback(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();


};
