const user = process.argv[2];
const PouchDB = require('pouchdb');
const { request, password } = require('./utils');
PouchDB.plugin(require('pouchdb-adapter-memory'));

const remoteDb = new PouchDB(`http://localhost:5988/medic`, {
  skip_setup: true,
  auth: { username: user, password }
});
const localDb = new PouchDB(`scalability-test`, {
  adapter: 'memory',
  auto_compaction: true
});

let docIdsRevs;
let remoteDocCount;

const INITIAL_REPLICATION_LOG = '_local/initial-replication';
const BATCH_SIZE = 100;

const startInitialReplication = async (localDb) => {
  if (await getReplicationLog(localDb)) {
    return;
  }

  const log = {
    _id: INITIAL_REPLICATION_LOG,
    start_time: Date.now(),
  };

  await localDb.put(log);
};

const completeInitialReplication = async (localDb) => {
  const replicationLog = await getReplicationLog(localDb);
  if (!replicationLog) {
    throw new Error('Invalid replication state: missing replication log');
  }

  replicationLog.complete = true;
  replicationLog.duration =  Date.now() - replicationLog.start_time;

  console.info(replicationLog.duration / 1000);
  await localDb.put(replicationLog);
};

const getMissingDocIdsRevsPairs = async (localDb, remoteDocIdsRevs) => {
  const localDocs = await getLocalDocList(localDb);
  return remoteDocIdsRevs.filter(({ id, rev }) => !localDocs[id] || localDocs[id] !== rev);
};

const getDownloadList = async (localDb = true) => {
  const response = await request({ uri: '/api/v1/replication/get-ids', auth: `${user}:${password}` });

  docIdsRevs = await getMissingDocIdsRevsPairs(localDb, response.doc_ids_revs);
  remoteDocCount = response.doc_ids_revs.length;

  if (response.warn) {
    await displayTooManyDocsWarning(response);
  }
};

const getLocalDocList = async (localDb) => {
  const response = await localDb.allDocs();

  const localDocMap = {};
  response.rows.forEach(row => localDocMap[row.id] = row.value && row.value.rev);
  return localDocMap;
};

const getDocsBatch = async (remoteDb, localDb) => {
  const batch = docIdsRevs.splice(0, BATCH_SIZE);

  if (!batch.length) {
    return;
  }

  const res = await remoteDb.bulkGet({ docs: batch, attachments: true, revs: true });
  const docs = res.results
    .map(result => result.docs && result.docs[0] && result.docs[0].ok)
    .filter(doc => doc);
  await localDb.bulkDocs(docs, { new_edits: false });
};

const downloadDocs = async (remoteDb, localDb) => {
  do {
    await getDocsBatch(remoteDb, localDb);
  } while (docIdsRevs.length > 0);
};

const writeCheckpointers = async (remoteDb, localDb) => {
  const localInfo = await localDb.info();
  await localDb.replicate.to(remoteDb, {
    since: localInfo.update_seq,
  });
};

const replicate = async (remoteDb, localDb) => {
  await startInitialReplication(localDb);
  await getDownloadList(localDb);
  await downloadDocs(remoteDb, localDb);
  await writeCheckpointers(remoteDb, localDb);

  await completeInitialReplication(localDb);
};

const getReplicationLog = async (localDb) => {
  try {
    return await localDb.get(INITIAL_REPLICATION_LOG);
  } catch (err) {
    return null;
  }
};

replicate(remoteDb, localDb);

