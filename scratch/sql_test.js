const { sql, poolPromise } = require('../src/config/db');
async function run() {
  const pool = await poolPromise;
  const result = await pool.request().query("SELECT ItemCode, HealthStatus FROM [QGetSaftyStockItems] WHERE ItemCode='R1346'");
  console.log(result.recordset);
  process.exit(0);
}
run();
