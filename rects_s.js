var express = require('express');

var fs   = require('fs');
var url  = require('url');
var http = require('http');
var path = require('path');

function mainpage(req, res)
{
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
    console.log("mainpage()");
}

function getdoc(req, res)
{
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
    console.log("getdoc()");
}

function savedoc(req, res)
{
    var method = req.method;
    if( method !== 'POST' )
    {
        res.writeHead(405, {"Content-Type": "text/plain"});
        res.write("use POST to save" + "\n");
        res.end();
        return;
    }

    var filename="saved.json";
    console.log("I should probably do something with this data");

    console.log("savedoc()");
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
