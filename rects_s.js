// var express = require('express');
// app.use(express.json());

var fs   = require('fs');
var url  = require('url');
var http = require('http');
var path = require('path');
var qs = require('querystring');

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
    var method = req.method;
    if( method !== 'POST' )
    {
        res.writeHead(405, {"Content-Type": "text/plain"});
        res.write("use POST to save" + "\n");
        res.end();
        return;
    }

    var body = '';
    req.on('data', function(data){
        body += data;
    });
    req.on('end', function(){
        var POST = qs.parse(body);
        // console.log(POST);
        var filedata = POST.file;
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
    });
}

function dispatch(req, res)
{
    var parts = url.parse(req.url);
    switch(parts.pathname)
    {
        case "/favicon.ico":
            res.end();
            break;
        case "/getdoc":
            getdoc(req, res);
            break;
        case "/savedoc":
            savedoc(req, res);
            break;
        default:
            mainpage(req, res);
            break;
    }
}

http.createServer(function (req, res) {
    dispatch(req, res);
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');
