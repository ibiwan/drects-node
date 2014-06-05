#!/usr/local/bin/node

var sqlite3  = require('sqlite3').verbose();
var password = require('password-hash-and-salt');

var user = null;
var pass = null;
var name = null;

process.argv.forEach(function (val, index, array) {
    var eq = val.indexOf('=');
    if(eq)
    {
        parts = val.split('=');
        key = parts[0];
        val = parts[1];
        if( key === '--user' )
        {
            user = val;
        }
        if( key === '--pass' )
        {
            pass = val;
        }
        if( key === '--name' )
        {
            name = val; // fixme: handle spaces in name
        }
    }
});

if( user === null || pass === null )
{
    console.log("use with --user=username --pass=password");
    exit();
}

console.log("creating/updating user: " + user + " with password: " + pass);

var db = new sqlite3.Database('blah.db');
db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, username TEXT, passhash TEXT, full_name TEXT)");

password(pass).hash(function(error, hash) {
    if(error)
    {
        throw new Error(error);
    }

    // Store hash (incl. algorithm, iterations, and salt)
    db.get('SELECT * FROM user WHERE username = ?', user, function(err, row){
        if( err )
        {
            throw new Error(err);
        }

        if( row )
        {
            console.log("UPDATING USER");
            db.run("UPDATE user SET passhash=?, full_name=? WHERE id = ?", [hash, name ? name : row.full_name, row.id],
                function(e){
                    if(e) console.log("error:", e);
                });
            // update user
        } else {
            console.log("CREATING USER");
            // create user
            db.run("INSERT INTO user (username, passhash, full_name) VALUES (?, ?, ?)", [user, hash, name ? name : ''],
                function(e){
                    if(e) console.log("error:", e);
                });
        }
        db.close();
    });
});

