(function(){

    var sqlite3    = require('sqlite3').verbose();
    var _db;

    function logErr(err) {
        if(err) {
            console.log("DB error!", err);
        }
    }

    function setupDB()
    {
        _db = new sqlite3.Database('rects.db');

        _db.run("PRAGMA foreign_keys = ON");
        _db.run("CREATE TABLE IF NOT EXISTS user ( " +
                    "id        INTEGER PRIMARY KEY, " +
                    "username  TEXT, " +
                    "passhash  TEXT, " +
                    "full_name TEXT, " +
                    "archived  INTEGER DEFAULT 0" +
        ")");
        _db.run("CREATE TABLE IF NOT EXISTS version ( " +
                    "id       INTEGER PRIMARY KEY, " +
                    "datetime TEXT, " +
                    "content  TEXT, " +
                    "parent   INTEGER, " +
                "FOREIGN KEY(parent) REFERENCES version(id) " +
        ")");
        _db.run("CREATE TABLE IF NOT EXISTS document ( " +
                    "id       INTEGER PRIMARY KEY, " +
                    "owner    INTEGER NOT NULL, " +
                    "filename TEXT NOT NULL, " +
                    "latest   INTEGER NOT NULL, " +
                    "archived INTEGER DEFAULT 0, " +
                "FOREIGN KEY(owner) REFERENCES user(id), " +
                "FOREIGN KEY(latest) REFERENCES version(id) " +
        ")");
        // _db.run("delete from document");
        // _db.run("delete from version");
        _db.run("delete from user where id >= 3");
    }

    function dumpDB() {
        _db.each("SELECT * FROM user", function(err, row){
            console.log("user:", row);
        });
        _db.each("SELECT * FROM version", function(err, row){
            console.log("version:", row);
        });
        _db.each("SELECT * FROM document", function(err, row){
            console.log("document:", row);
        });
    }

    function getUserByName(username, callbacks)
    {
        if(   callbacks.found === undefined) {    callbacks.found = function(row){console.log("user found!");}; }
        if(callbacks.notfound === undefined) { callbacks.notfound = function(   ){console.log("user not found!");}; }
        if(   callbacks.error === undefined) {    callbacks.error = logErr; }

        _db.get('SELECT * FROM user WHERE username = ?', username, function(err, row){
            if(err) {
                callbacks.error(err);
            } else if (row) {
                callbacks.found(row);
            } else {
                callbacks.notfound();
            }
        });
    }

    function createUser(username, passhash, full_name, result_cb)
    {
        if( full_name === undefined ) { full_name = ''; }
        if( result_cb === undefined ) { result_cb = logErr }

        _db.run(
            "INSERT INTO user (username, passhash, full_name) VALUES (?, ?, ?)",
            [username, passhash, full_name],
            result_cb);
    }

    function updateUser(user_id, passhash, full_name, result_cb)
    {
        if( full_name === undefined ) { full_name = ''; }
        if( result_cb === undefined ) { result_cb = function(err){ if(err) console.log("error!", err); }; }

        _db.run(
            "UPDATE user SET passhash=?, full_name=? WHERE id = ?",
            [passhash, full_name, user_id],
            result_cb);
    }

    function getDocumentByUserAndFilename(userid, filename, callbacks)
    {
        if(callbacks.found    === undefined) { callbacks.found    = function(row){console.log("file found!");};     }
        if(callbacks.notfound === undefined) { callbacks.notfound = function(   ){console.log("file not found!");}; }
        if(callbacks.error    === undefined) { callbacks.error    = logErr }

        _db.get('SELECT * FROM document WHERE owner = ? AND filename = ? ORDER BY id DESC LIMIT 1',
            [userid, filename],
            function(err, row){
                if(err) {
                    callbacks.error(err);
                } else if (row) {
                    callbacks.found(row);
                } else {
                    callbacks.notfound();
                }
            });
    }

    function listUserDocuments(userid, callbacks) 
    {
        if( callbacks.success === undefined ) { callbacks.success = function(rows){
            for(var i in rows) {
                var row = rows[i];
                console.log("row, id:", (row.id) ? (row.id) : '')}; 
            }
        }
        if( callbacks.error   === undefined ) { callbacks.error   = logErr; }

        var blah = _db.all('SELECT * FROM document WHERE owner = ?',
            [userid],
            function(err, rows){
                if(err) {
                    callbacks.error(err);
                } else {
                    callbacks.success(rows);
                }
            });
        _db.wait(function(){console.log("yo");});
        console.log("sync");
    }

    function createDocument(owner, filename, latest, result_cb)
    {
        if( result_cb === undefined ) { result_cb = logErr; }

        _db.run(
            'INSERT INTO document (owner, filename, latest) VALUES (?, ?, ?)',
            [owner, filename, latest],
            result_cb);
    }

    function updateDocument(document_id, filename, latest, result_cb)
    {
        if( result_cb === undefined ) { result_cb = logErr; }

        _db.run(
            'UPDATE document SET filename=?, latest=? WHERE id = ?',
            [filename, latest, document_id],
            result_cb);
    }

    function createVersion(content, parent_id, result_cb)
    {
        if( result_cb === undefined ) { result_cb = logErr; }

        _db.run(
            'INSERT INTO version (datetime, content, parent) VALUES (?, ?, ?)',
            [Date.now(), content, parent_id],
            result_cb);
    }

    function getDocumentVersion(userid, filename, callbacks)
    {
        if(callbacks.found    === undefined) { callbacks.found    = function(row){console.log("file found!");};     }
        if(callbacks.notfound === undefined) { callbacks.notfound = function(   ){console.log("file not found!");}; }
        if(callbacks.error    === undefined) { callbacks.error    = logErr }

        _db.get('SELECT * FROM document LEFT JOIN version ON document.latest = version.id WHERE owner = ? AND filename = ? ORDER BY id DESC LIMIT 1',
            [userid, filename],
            function(err, row){
                if(err) {
                    callbacks.error(err);
                } else if (row) {
                    callbacks.found(row);
                } else {
                    callbacks.notfound();
                }
            });
    }

    setupDB();

    module.exports = {
        dump                   : dumpDB,
        getUserByName          : getUserByName,
        createUser             : createUser,
        updateUser             : updateUser,
        getDocumentByUserAndFilename : getDocumentByUserAndFilename,
        listUserDocuments      : listUserDocuments,
        createDocument         : createDocument,
        updateDocument         : updateDocument,
        createVersion          : createVersion,
        getDocumentVersion : getDocumentVersion,
    };
})();

