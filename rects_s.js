#!/usr/local/bin/node

var fs         = require('fs');
// npm install express body-parser
var express    = require('express');
var bodyParser = require('body-parser');

var port = 1338;
var app = express()
  .get('/',         mainpage)
  .get('/getdoc',   getdoc)
  .post('/savedoc', bodyParser(), savedoc)
  .get('/favicon.ico', function(req, res){
    res.send(404, 'No favicon');
  })
  .listen(port);
console.log("listening on ", port);

function mainpage(req, res)
{
    console.log("mainpage()");
    res.sendfile('rects_c.html');
}

function getdoc(req, res)
{
    console.log("getdoc()");
    res.sendfile("dnd.json");
}

function savedoc(req, res)
{
    console.log("savedoc()");

    var filedata = req.body.file;
    filedata = JSON.stringify(JSON.parse(filedata), null, '  ');

    var filename = "saved.json";
    fs.writeFile(filename, filedata, {}, function(err){
        if( err )
        {
            console.log("error saving:", err);
            res.json(500, {'success':false,'error':err});
        } else {
            res.json(200, {'success':true});
        }
    });
}
