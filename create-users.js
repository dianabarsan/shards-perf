const { request } = require('./utils');

const getUserSettings = async () => {
  const rows = await request({ uri: '/medic/_design/medic-client/_view/doc_by_type?key=%5B"user-settings"%5D&include_docs=true' });
  return rows.rows.map((row) => row.doc);
}

const createUsers = async () => {
  const userSettings = await getUserSettings();
  const users = userSettings.map(userSettings => ({
    _id: userSettings._id,
    name: userSettings._id.replace('org.couchdb.user:', ''),
    type: 'user',
    roles: userSettings.roles,
    facility_id: userSettings.facility_id,
    contact_id: userSettings.contact_id,
    password: 'pass',
  }));

  await request({ uri: '_users/_bulk_docs', body: { docs: users }, method: 'POST' });
};

createUsers();
