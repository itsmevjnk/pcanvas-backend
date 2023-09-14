var config = require('./config.json');
var mysql = require('mysql');

const db = mysql.createConnection({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.schema
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