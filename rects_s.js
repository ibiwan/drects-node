#!/usr/local/bin/node

/*
 *  The server, the host, the brains behind the operation.
 *  Implemented as an express() server, backed by a sqlite db generated on the fly if not present.
 */

var fs         = require('fs');

// npm install express body-parser morgan sqlite3 cookie-parser express-session password-hash-and-salt csurf handlebars
var express    = require('express');

// middlewarez
var bodyParser = require('body-parser')();
var morgan     = require('morgan')('dev');
var cookie     = require('cookie-parser')();
var session    = require('express-session');
// var csrf       = require('csurf')();
var csrf = function(a, b, next){next();};

// libraries
var sqlite3    = require('sqlite3').verbose();
var password   = require('password-hash-and-salt');
var handlebars = require('handlebars');

var db         = require('./private/db');

function makesecret()    //pseudorandom!
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 20; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

function init()
{
    var secret = setupSessionSecret();
    setupServer(secret);
}

function setupSessionSecret()
{
    var secret = makesecret(); // overwritten if text version found
    var secret_file = 'session_secret.txt';
    fs.readFile(secret_file, function(err, data){
        if(err) {   // save generated secret
            fs.writeFile(secret_file, secret);
        } else {    // load saved secret
            secret = data.toString();
        }
    });
    return secret;
}

function setupServer(secret)
{
    function denyAnon(req, res, next)
    {
        if( ! req.session.userid ) { return res.redirect('/'); } // requires session
        else next();
    }

    function renderLogin(req, res, message)
    {
        fs.readFile(__dirname + '/templates/login.html', function(err, data){
            if( err ) throw new Exception(err);
            var template = handlebars.compile(data.toString());
            res.send(template({'message':message}));
        });
    }

    var handlers = {
        'landing'  : function landing(req, res)
            {
                console.log("landing()");

                if( !req.session.userid ) {
                    // if not logged in, present form
                    return renderLogin(req, res, '');
                }

                if( req.session.filename ) {
                    // if logged in, with file set, redirect to viewer
                    return res.redirect('/viewer');
                } else {
                    // if logged in with no file set, redirect to listdocs
                    return res.redirect('/listdocs');
                }
            },
        'login'    : function login(req, res)
            {
                console.log("login()");

                // accepts form results and checks authentication.
                if ( !(req.body && req.body.user && req.body.password) ) {
                    console.log("no user/pass offered");
                    return res.redirect('/');
                }

                var user = req.body.user;
                var pass = req.body.password;
                console.log("login attempted:", user, pass);

                db.getUserByName(user, {
                    found    : function(row){
                        password(pass).verifyAgainst(row.passhash, function(error, verified) {
                            if(error) { throw new Error(error); }

                            if(!verified) {
                                // if password fail, present retry form
                                console.log("bad password for user:", user);
                                return renderLogin(req, res, 'Unknown user or bad password; please try again.');
                            }
                            // if success, log in and redirect to landing
                            console.log("user logged in:", user);
                            req.session.userid = row.id;
                            return res.redirect('/');
                        });
                    },
                    notfound : function(   ){
                        console.log("unknown user:", user);
                        return renderLogin(req, res, 'Unknown user or bad password; please try again.');
                    },
                });
            },
        'logout'   : function logout(req, res)
            {
                console.log("logout()");

                // invalidate session and redirect to landing
                req.session.destroy();
                return res.redirect('/');
            },
        'files'    : function files(req, res)
            {
                // serve up handy dandy js and css files
                console.log("files("+req.params[0]+")");
                res.sendfile(__dirname + '/public/' + req.params[0], function(err){if(err)console.log(err);});
            },
        'listdocs' : function listdocs(req, res)
            {
                console.log("listdocs()");

                // present list of available files for user.
                fs.readdir(__dirname + '/documents', function(err, files){
                    var out = '';
                    for(var i = 0; i < files.length; i++)
                    {
                        out += "<a href='/viewer/" + files[i] + "'>" + files[i] + "</a><br />";
                    }
                    res.send(out);
                });
            },
        'viewer' : function viewer(req, res)
            {
                console.log("viewer()");

                // if no file selected via params OR session, redirect to listdocs, else serve viewer
                if( req.params.filename ) {
                    req.session.filename = req.params.filename;
                    return res.redirect('/viewer');
                } else if( !req.session.filename ) {
                    return res.redirect('/listdocs');
                }

                res.sendfile(__dirname + "/templates/viewer.html", function(err){if(err)console.log(err);});
            },
        'getdoc' : function getdoc(req, res)
            {
                // JSON responder; serve requested file or default file
                console.log("getdoc()");
                filename = req.session.filename;

                if( filename ) {
                    console.log("requested file: ", filename);
                } else {
                    console.log("using default file:");
                    req.session.filename = filename = 'dnd.json';
                }
                var filepath = 'documents/' + filename;

                fs.readFile(filepath, function(err, data){
                    if(err) {
                        res.send({success:false});
                        console.log("couldn't load:", filepath, "err:", err, "data:", data);
                    } else {
                        res.send({
                            success  : true,
                            filename : filename,
                            file     : data.toString()
                        });
                    }
                });
            },
        'savedoc' : function savedoc(req, res)
            {
                console.log("savedoc()");

                function ajaxerr(err) {
                    console.log("err:", err);
                    res.json(500, {'success':false,'error':err});
                }

                filename = req.body.filename;
                console.log(filename);

                var filedata = JSON.stringify(JSON.parse(req.body.file), null, '  ');

                var filepath = __dirname + "/documents/saved.json";
                fs.writeFile(filepath, filedata, {}, function(err){
                    if( err ) {
                        console.log("error saving to file:", err);
                    }
                });

                var owner_id = req.session.userid;

                db.getDocumentByUserAndFilename(owner_id, filename, {
                    found    : function(doc){
                        console.log("updating document");

                        db.createVersion(filedata, doc.latest, function(err){
                            if( err ) { return ajaxerr(err); }
                            var versionid = this.lastID;

                            db.updateDocument(doc.id, filename, versionid, function(err){
                                if( err ) { return ajaxerr(err); }
                                res.json(200, {'success':true});
                                // db.dump();
                            });
                        });
                    },
                    notfound : function(   ){
                        console.log("new document");

                        db.createVersion(filedata, null, function(err){
                            if( err ) { return ajaxerr(err); }
                            var versionid = this.lastID;

                            db.createDocument(owner_id, filename, versionid, function(err){
                                if(err) {
                                    console.log("err:", err);
                                    res.json(500, {'success':false,'error':err});
                                    return;
                                }
                                res.json(200, {'success':true});
                                // db.dump();
                            });
                        });
                    },
                    error    : function(err) { return ajaxerr(err); },
                });
            },
        'favicon' : function favicon(req, res) { res.send(404, 'No favicon'); },
    };

    var publicRoutes = express.Router()
        .get ('/',                        handlers.landing)
        .post('/login', bodyParser, csrf, handlers.login)
        .get ('/files/*',                 handlers.files)
        .get ('/favicon.ico',             handlers.favicon);

    var privateRoutes = express.Router()
        .use(denyAnon)
        .get ('/logout',                    handlers.logout)
        .get ('/listdocs',                  handlers.listdocs)
        .get ('/viewer',                    handlers.viewer)
        .get ('/viewer/:filename',          handlers.viewer)
        .get ('/getdoc',                    handlers.getdoc)
        .post('/savedoc', bodyParser, csrf, handlers.savedoc);

    var port = 1338;
    var app = express()
        .use(morgan) // automatic logging ftw
        .use(cookie)
        .use(session({secret: secret}))

        .use(publicRoutes)
        .use(privateRoutes)

        .listen(port);

    console.log("listening on ", port);
}

init();