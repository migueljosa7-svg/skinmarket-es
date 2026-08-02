import db from './src/backend/db.js';
console.log("Connecting...");
try {
    const res = await db.query('SELECT NOW()');
    console.log("Success:", res.rows[0]);
    process.exit(0);
} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
