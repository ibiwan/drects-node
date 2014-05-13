#!/usr/local/bin/node

var qs         = require('querystring');
var fs         = require('fs');
// npm install express body-parser
var express    = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser());

app.get('/favicon.ico', function(req, res){res.end();});
app.get('/',         mainpage);
app.get('/getdoc',   getdoc);
app.post('/savedoc', savedoc);

var port = 1338;
app.listen(port);
console.log("listening on ", port);

function mainpage(req, res)
{
    console.log("mainpage()");
    var filename = 'rects_c.html';
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.write(err + "\n");
        res.end();
        return;
      }
      res.writeHead(200);
      res.write(file, "binary");
      res.end();
    });
}

function getdoc(req, res)
{
    console.log("getdoc()");
    var filename = 'dnd.json';
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.write(err + "\n");
        res.end();
        return;
      }
      res.writeHead(200);
      res.write(file, "binary");
      res.end();
    });
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
            res.writeHead(500);
            res.write(JSON.stringify({'success':false, 'error':err}));
            res.end();
        } else {
            res.writeHead(200);
            res.write(JSON.stringify({'success':true}));
            res.end();
        }
    });
}
