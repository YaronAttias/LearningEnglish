const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs'), path = require('node:path');
function createDB(filename = ':memory:') {
  const db = new DatabaseSync(filename); db.exec('PRAGMA foreign_keys = ON');
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='students'").get()) db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/0000_usage.sql'),'utf8'));
  if (!db.prepare('PRAGMA table_info(students)').all().some(column => column.name === 'source')) db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/0001_automatic_visitors.sql'),'utf8'));
  function prepare(sql) {
    let args = [];
    const query = {bind(...values) { args = values; return query; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return {results:db.prepare(sql).all(...args)}; },
      async run() { return query.execute(); },
      execute() { return db.prepare(sql).run(...args); }};
    return query;
  }
  return {prepare, async batch(queries) { db.exec('BEGIN'); try { const results=queries.map(q=>q.execute());db.exec('COMMIT');return results; } catch(error) { db.exec('ROLLBACK');throw error; } },close() {db.close();}, raw:db};
}
module.exports = {createDB};
