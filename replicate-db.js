const [,, db1, db2] = process.argv;
const PouchDB = require('pouchdb');

const dbName1 = db1.startsWith('http') ? db1 : `http://localhost:5988/${db1}`;
const dbName2 = db2.startsWith('http') ? db2 : `http://localhost:5988/${db2}`;

const opts = { auth: { username: 'admin', password: 'pass' } };

const remoteDb1 = new PouchDB(dbName1, opts);
const remoteDb2 = new PouchDB(dbName2, opts);

remoteDb1.replicate.to(remoteDb2, { batch_size: 1000 });
