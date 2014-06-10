#!/usr/local/bin/node

/*
 *  Script to create/modify users, their passwords, and their full names.  Other things too, I guess, if there's reason to.
 */

var sqlite3  = require('sqlite3').verbose();
var argv = require('minimist')(process.argv.slice(2));

var user = argv.u;

if( user === null )
{
    console.log("use with -u username");
    exit();
}

console.log("deleting user: " + user);

var db = new sqlite3.Database('rects.db');

db.get('SELECT * FROM user WHERE username = ?', user, function(err, row){
    if( err )
    {
        throw new Error(err);
    }

    if( row )
    {
        console.log("DELETING USER");
        db.run("DELETE FROM user WHERE id = ?", [row.id],
            function(e){
                if(e) console.log("error:", e);
            });
    } else {
        console.log("no such user; what are you trying to pull!?");
    }
    db.close();
});

