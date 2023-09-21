var mysql = require('mysql');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_SCHEMA
});
db.connect(function(error) {
    if(!!error) console.log('Cannot connect to database:', error);
    else console.log('Database connected successfully');
});
db.query("SET time_zone = '+00:00'", function(err, result, fields) {
    if(err) console.log('Cannot set time zone:', err);
    else console.log('Time zone set to UTC');
});

module.exports = db;