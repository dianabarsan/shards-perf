const { request } = require('./utils');

const dbName = process.argv[2] || 'medic';

const queryView = async (ddocName) => {
  try {
    await request({ uri: `/${dbName}/${ddocName}/_view/dummy?limit=1`, method: 'GET' });
  } catch (e) {
    console.error(e);
  }
};

const ddocNames = ['_design/medic', '_design/medic-client'];
const makeDummyView = () => `function(doc){ emit(doc._id, ${ Math.random(0, 10000) }); }`;

const updateView = async (ddocName) => {
  const ddoc = await request({ uri: `/${dbName}/${ddocName}` });
  ddoc.views.dummy = { map: makeDummyView() };
  await request({ uri: `/${dbName}/${ddocName}`, body: ddoc, method: 'PUT' });
  queryView(ddocName);
};

const getIndexerTasks = async () => {
  const tasks = await request({ uri: `/_active_tasks` });
  return tasks.filter(task => task.type === 'indexer');
};

const watchTasks = async () => {
  let startTime;
  let started = false;
  let activeTasks = false;
  let counter = 0;

  do {
    const tasks = await getIndexerTasks();
    if (counter++ % 1_000) {
      console.log('Active tasks:', tasks.length);
    }

    activeTasks = tasks.length;
    if (activeTasks && !started) {
      started = true;
      startTime = performance.now();
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  } while (!started || activeTasks);

  return performance.now() - startTime;
};

const runTest = async () => {
  const tasks = await getIndexerTasks();
  if (tasks.length) {
    await watchTasks();
  }

  for (const ddoc of ddocNames) {
    await updateView(ddoc);
  }
  const elapsedTime = await watchTasks();
  console.log(elapsedTime);
};

runTest();
