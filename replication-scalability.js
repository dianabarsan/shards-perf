const { exec } = require('child_process');
const { request } = require('./utils');
const fs = require('fs');

const NBR = 2;

const getUsers = async () => {
  const users = await request({ uri: `_users/_all_docs?limit=${NBR}&start_key="org.couchdb.user"` });
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
      resolve(stdout);
    });
  });
};

(async () => {
  const users = await getUsers();
  const times = await Promise.all(users.map(user => replicateUser(user)));
  fs.writeFileSync('./times.json', JSON.stringify(times));
})();
