const path = require('path');

const request = async ({ uri, body={}, method='GET', auth }) => {
  auth = auth || 'admin:pass';
  const url = path.join('http://localhost:5988', uri);
  const headers = new Headers({
    'accept': 'application/json',
    'content-type': 'application/json',
    'authorization': `Basic ${btoa(auth)}`,
  });

  const opts = { headers, method };
  if (method !== 'GET' && method !== 'HEAD') {
    opts.body = JSON.stringify(body);
  }
  const response = await fetch(url, opts);
  if (!response.ok) {
    const error = new Error(`Error occurred: ${response.status}`);
    error.headers = response.headers;
    error.body = await response.text();
    error.status = response.status;

    throw error;
  }

  return await response.json();
};

module.exports = {
  request,
  password: 'medic.123',
};
