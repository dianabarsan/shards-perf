const { exec } = require('child_process');
const { request } = require('./utils');
const fs = require('fs');

const [,, nbrConcurrentUsers ] = process.argv;
const NBR = nbrConcurrentUsers || 100;

const getUsers = async () => {
  const users = await request({ uri: `_users/_all_docs?limit=${NBR}&start_key="org.couchdb.user:u"` });
  return users.rows.map((row) => row.id.replace('org.couchdb.user:', ''));
};

const replicateUser = (user) => {
  return new Promise((resolve, reject) => {
    exec(`node ./initial-replication.js ${user}`, (error, stdout, stderr) => {
      if (error) {
        return reject(`exec error: ${error}`);
      }
      if (stderr) {
        return reject(`exec error: ${stderr}`);
      }
      resolve(parseInt(stdout));
    });
  });
};

(async () => {
  const users = await getUsers();
  const times = await Promise.all(users.map(user => replicateUser(user)));
  fs.writeFileSync('./times.json', JSON.stringify(times));
  console.warn(times.reduce((a, s) => a + s, 0) / times.length);
})();
