const [,, db1, db2] = process.argv;
const PouchDB = require('pouchdb');
const { request, password } = require('./utils');

const remoteDb1 = new PouchDB(`http://localhost:5988/${db1}`, {
  auth: { username: 'admin', password: 'pass' },
});

const remoteDb2 = new PouchDB(`http://localhost:5988/${db2}`, {
  auth: { username: 'admin', password: 'pass' },
});

remoteDb1.replicate.to(remoteDb2, { batch_size: 1000 });
