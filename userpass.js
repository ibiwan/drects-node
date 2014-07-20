#!/usr/local/bin/node

/*
 *  Script to create/modify users, their passwords, and their full names.  Other things too, I guess, if there's reason to.
 */

var password = require('password-hash-and-salt');
var argv     = require('minimist')(process.argv.slice(2));
var Promise  = require('promise');
var db       = require('./private/db');

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


password(pass).hash(function(error, hash) {
    if(error)
    {
        throw new Error(error);
    }

    db.checkUserExistence(user)
    .then(function user_check_success(result) { 
        if(result) {
            console.log("user found: ", result);
            return db.updateUser(result.id, hash, result.full_name);
        } else {
            console.log("user not found; creating");
            return db.createUser(user, hash, name);
        }
    })
    .catch(function any_error(error){
        console.log("error:", error);
    });
});
