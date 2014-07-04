#!/usr/local/bin/node

/*
 *  Script to create/modify users, their passwords, and their full names.  Other things too, I guess, if there's reason to.
 */

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

var db = require('./private/db');

password(pass).hash(function(error, hash) {
    if(error)
    {
        throw new Error(error);
    }

    db.checkUserExistence(user, {
        found    : function(row){
            console.log("UPDATING USER");
            db.updateUser(row.id, hash, name, function(err){
                if( err ) {
                    console.log("error:", err);
                } else {
                    console.log("success!");
                    db.dump();
                }
            });
        },
        notfound : function(   ){
            console.log("CREATING USER");
            db.createUser(user, hash, name, function(err){
                if( err ) {
                    console.log("error:", err);
                } else {
                    console.log("success!");
                    db.dump();
                }
            });
        },
        error    : function(err){ throw new Error(err); },
    });
});
