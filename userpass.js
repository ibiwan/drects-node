#!/usr/local/bin/node

/*
 *  Script to create/modify users, their passwords, and their full names.  Other things too, I guess, if there's reason to.
 */

var sqlite3  = require('sqlite3').verbose();
var password = require('password-hash-and-salt');
var argv = require('minimist')(process.argv.slice(2));

var user = argv.u;
var pass = argv.p;
var name = argv._.join(" ");

console.log(user, pass, name);

if( user === null || pass === null )
{
    console.log("use with -u username -p password Full Name Here Optionally");
    exit();
}

console.log("creating/updating user: " + user + " with password: " + pass);

var db = new sqlite3.Database('rects.db');
db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, username TEXT, passhash TEXT, full_name TEXT, archived BOOL DEFAULT false)");

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

