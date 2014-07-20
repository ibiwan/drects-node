(function(){

    var Promise = require('promise');
    var sqlite3    = require('sqlite3').verbose();
    var _db;

    function logErr(err) {
        if(err) {
            console.log("DB error!", err);
        }
    }

    function destroyData()
    {
        // _db.run("delete from document");
        // _db.run("delete from version");
        // _db.run("delete from user where id >= 3");        
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
        destroyData();
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

    function get(query, params){
        return new Promise(function (resolve, reject){
            _db.get(query, params, function (err, res){
                if (err) reject(err);
                else     resolve(res);
            });
        });
    }
    function run(query, params){
        return new Promise(function (resolve, reject){
            _db.run(query, params, function (err, res){
                if (err) reject(err);
                else     resolve(res);
            });
        });
            }
    function all(query, params){
        return new Promise(function (resolve, reject){
            _db.all(query, params, function (err, res){
                if (err) reject(err);
                else     resolve(res);
            });
        });
    }

    function checkUserExistence(username)
    {
        return get(
            'SELECT * FROM user WHERE username = ?', 
            [username]);
    }

    function createUser(username, passhash, full_name)
    {
        if( full_name === undefined ) { full_name = ''; }
        return run(
            "INSERT INTO user (username, passhash, full_name) VALUES (?, ?, ?)",
            [username, passhash, full_name]);
    }

    function updateUser(user_id, passhash, full_name)
    {
        return run(
            "UPDATE user SET passhash=?, full_name=? WHERE id = ?",
            [passhash, full_name, user_id]);
    }

    function deleteUser(user_id) 
    {
        return run(
            "DELETE FROM user WHERE id = ?", 
            [user_id]);
    }

    function getDocument(userid, filename)
    {

        return get(
            'SELECT * FROM document WHERE owner = ? AND filename = ? ORDER BY id DESC LIMIT 1',
            [userid, filename]);
        }

    function listUserDocuments(userid) 
    {
        return all(
            'SELECT * FROM document WHERE owner = ?',
            [userid]);
    }

    function createDocument(owner, filename, latest)
    {
        return run(
            'INSERT INTO document (owner, filename, latest) VALUES (?, ?, ?)',
            [owner, filename, latest]);
    }

    function updateDocument(document_id, filename, latest)
    {
        return run(
            'UPDATE document SET filename=?, latest=? WHERE id = ?',
            [filename, latest, document_id]);
    }

    function createVersion(content, parent_id)
    {
        return run(
            'INSERT INTO version (datetime, content, parent) VALUES (?, ?, ?)',
            [Date.now(), content, parent_id]);
    }

    function getDocumentVersion(userid, filename)
    {
        return get(
            'SELECT * FROM document LEFT JOIN version ON document.latest = version.id WHERE owner = ? AND filename = ? ORDER BY id DESC LIMIT 1',
            [userid, filename]);
    }

    setupDB();

    module.exports = {
        dump               : dumpDB,
        checkUserExistence : checkUserExistence,
        createUser         : createUser,
        updateUser         : updateUser,
        deleteUser         : deleteUser,
        getDocument        : getDocument,
        listUserDocuments  : listUserDocuments,
        createDocument     : createDocument,
        updateDocument     : updateDocument,
        createVersion      : createVersion,
        getDocumentVersion : getDocumentVersion,
    };
})();

