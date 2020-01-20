#!/usr/local/bin/node

/*
 *  The server, the host, the brains behind the operation.
 *  Implemented as an express() server, backed by a sqlite db generated on the fly if not present.
 */
// npm install express body-parser morgan sqlite3 express-session password-hash-and-salt csurf handlebars promise proxmis
// sudo npm install -g nodemon

// libraries
var fs         = require('fs');
var express    = require('express');
var Promise    = require('promise');
var proxmis    = require('proxmis');
var password   = require('password-hash-and-salt');
var handlebars = require('handlebars');

var db         = require('./private/db');

// middlewarez
var bodyParser = require('body-parser');
var morgan     = require('morgan')('dev');
var session    = require('express-session');
// var csrf       = require('csurf')();
var csrf = function(a, b, next){next();};

function logErr(err) {
    if(err) {
        console.log(err);
    }
}

function verifyPassAgainstHash(pass, hash){
  return proxmis.wrap(function(cb){ password(pass).verifyAgainst(hash, cb); });
}
function listFilesystemDocs(){
  return proxmis.wrap(function(cb){ fs.readdir(__dirname + '/documents', cb); });
}
function readFilesystemFile(filepath){
  return proxmis.wrap(function(cb){ fs.readFile(filepath, cb); });
}

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
            fs.writeFile(
                secret_file, 
                secret,
                 (...params)=>{
                     console.log('writeFile callback params', 
                     ...params
                )
            }
            );
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
            if( err ) throw err;
            var template = handlebars.compile(data.toString());
            res.send(template({'message':message}));
        });
    }

    var handlers = {
        'landing'  : function landing(req, res)
            {
                console.log("landing()");

                if( !req.session.userid ) { // not logged in
                    return renderLogin(req, res, '');
                }

                res.redirect(req.session.filename ? '/viewer' : '/listdocs');
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
                var user_id;
                console.log("login attempted:", user, pass);

                db.checkUserExistence(user)
                .then(function(result){
                    if(!result){
                        console.log("unknown user:", user);
                        renderLogin(req, res, 'Unknown user or bad password; please try again.');
                        throw "bad user";
                    }

                    user_id = result.id;
                    return verifyPassAgainstHash(pass, result.passhash);
                })
                .then(function(verified){
                    if(!verified) {
                        console.log("bad password for user:", user);
                        renderLogin(req, res, 'Unknown user or bad password; please try again.');
                        throw "bad password";
                    }

                    console.log("user logged in:", user);
                    req.session.userid = user_id;
                    return res.redirect('/');
                })
                .catch(function(error){
                    console.log("login error:", error);
                });
            },
        'logout'   : function logout(req, res)
            {
                console.log("logout()");

                req.session.destroy();
                return res.redirect('/');
            },
        'files'    : function files(req, res) // serve assets
            {
                console.log("files("+req.params[0]+")");

                res.sendfile(__dirname + '/public/' + req.params[0], logErr);
            },
        'listdocs' : function listdocs(req, res)
            {
                console.log("listdocs()");

                var owner_id = req.session.userid;

                Promise.all([
                    db.listUserDocuments(owner_id),
                    listFilesystemDocs()])
                .then(function(docs){
                    var i;
                    var userDocs = docs[0];
                    var templates = docs[1];

                    var out = 'User Files:<br /><ul>';
                    for(i = 0; i < userDocs.length; i++) {
                        var row = userDocs[i];
                        out += "<li><a href='/viewer/" + row.filename + "'>" + row.filename + "</a></li>";
                    }
                    out += '</ul><br />';

                    out += 'Template Files:<ul>';
                    for(i = 0; i < templates.length; i++) {
                        out += "<li><a href='/viewer/template/" + templates[i] + "'>" + templates[i] + "</a></li>";
                    }
                    out += '</ul>';

                    res.send(out);
                })
                .catch(function(error){
                    console.log("error listing docs:", error);
                });
            },
        'viewer' : function viewer(req, res)
            {
                console.log("viewer()");

                // if no file selected via params OR session, redirect to listdocs, else serve viewer
                if( req.params.filename ) {
                    req.session.type     = ( req.params.type === 'template' ) ? 'template' : 'editable';
                    req.session.filename = req.params.filename;

                    return res.redirect('/viewer');
                } else if( !req.session.filename ) {
                    return res.redirect('/listdocs');
                }

                res.sendfile(__dirname + "/templates/viewer.html", logErr);
            },
        'getdoc' : function getdoc(req, res)
            {
                // JSON responder; serve requested file or default file
                console.log("getdoc()");
                var filename = req.session.filename;
                var filetype = req.session.type ? req.session.type : 'template';

                if( filename ) {
                    console.log("requested file: ", filename);
                } else {
                    console.log("using default file:");
                    req.session.filename = filename = 'dnd-raw.json';
                }

                if( filetype === 'template' )
                { // load from filesystem
                    var filepath = 'documents/' + filename;

                    readFilesystemFile(filepath)
                    .then(function(data){
                        res.send({
                            success  : true,
                            filename : filename,
                            file     : data.toString()
                        });
                    })
                    .catch(function(error){
                        console.log("couldn't load:", filepath, "err:", error);
                        res.send({success:false});
                    });
                } else { // load from database
                    var owner_id = req.session.userid;

                    db.getDocumentVersion(owner_id, filename)
                    .then(function(document){
                        res.send({
                            success  : true,
                            filename : filename,
                            file     : document.content.toString()
                        });
                    })
                    .catch(function(error){
                        console.log("get doc error:", error);
                        res.send({success:false});
                    });
                }

            },
        'savedoc' : function savedoc(req, res)
            {
                console.log("savedoc()");

                var owner_id = req.session.userid;
                var filename = req.body.filename;

                console.log(filename);

                var filedata = JSON.stringify(JSON.parse(req.body.file), null, '  ');

                fs.writeFile(__dirname + "/documents/saved.json", filedata, {}, function(err){
                    if( err ) { // this is just icing; keep going if this file can't be saved
                        console.log("error saving to file:", err);
                    }
                });

                db.getDocument(owner_id, filename)
                .then(function(document){
                    db.createVersion(filedata, document ? document.latest : null)
                    .then(function(){
                        return db.getLastVersionId();
                    })
                    .then(function(version){
                        if(document){
                            console.log("existing document, updating");
                            return db.updateDocument(document.id, filename, version.id);
                        } else {
                            console.log("new document, creating");
                            return db.createDocument(owner_id, filename, version.id);
                        }
                    })
                    .then(function(document){
                        res.json(200, {'success':true});
                    });
                })
                .catch(function(e){
                    console.log("error while saving document:", e);
                    return res.json(500, {'success':false,'error':e});
                });
            },
        'favicon' : function favicon(req, res) { res.send(404, 'No favicon'); },
    };

    var publicRoutes = express.Router()//allow anon
        .post('/login',
            bodyParser.json(),
            bodyParser.urlencoded({extended:true,}),
            csrf,                        handlers.login)
        .get ('/',                       handlers.landing)
        .get ('/files/*',                handlers.files)
        .get ('/favicon.ico',            handlers.favicon);

    var privateRoutes = express.Router().use(denyAnon)
        .post('/savedoc',
            bodyParser.json(),
            bodyParser.urlencoded({extended:true,}),
            csrf,                        handlers.savedoc)
        .get ('/logout',                 handlers.logout)
        .get ('/listdocs',               handlers.listdocs)
        .get ('/viewer',                 handlers.viewer)
        .get ('/viewer/:filename',       handlers.viewer)
        .get ('/viewer/:type/:filename', handlers.viewer)
        .get ('/getdoc',                 handlers.getdoc);

    var port = 1338;
    var app = express()
        .use(morgan) // automatic logging ftw
        .use(session({
            secret: secret,
            saveUninitialized: true,
            resave: true,
        }))

        .use(publicRoutes)
        .use(privateRoutes)

        .listen(port);

    console.log("listening on ", port);
}

init();
