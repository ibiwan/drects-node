#!/usr/local/bin/node

/*
 *  Script to create/modify users, their passwords, and their full names.  Other things too, I guess, if there's reason to.
 */

var argv = require('minimist')(process.argv.slice(2));
var db   = require('./private/db');

var user = argv.u;

if( user === null )
{
    console.log("use with -u username");
    exit();
}

console.log("deleting user: " + user);

db.checkUserExistence(user)
.then(function(result){
    if(!result) {
        console.log("no such user; what are you trying to pull!?");
        return false;
    }
    console.log("DELETING USER");
    db.deleteUser(result.id);
})
.catch(function(error){
    console.log("error:", error);
});
