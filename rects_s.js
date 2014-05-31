#!/usr/local/bin/node

var fs         = require('fs');

// npm install express body-parser morgan
var morgan     = require('morgan');
var express    = require('express');
var bodyParser = require('body-parser');

handlers = {
  'files'    : function files(req, res)
      {
          console.log("files("+req.params[0]+")");
          res.sendfile(__dirname + '/public/' + req.params[0]);
      },
  'mainpage' : function mainpage(req, res)
      {
          console.log("mainpage()");
          res.sendfile(__dirname + '/rects_c.html');
      },
  'getdoc' : function getdoc(req, res)
      {
          console.log("getdoc()");
          res.sendfile(__dirname + "/dnd.json");
          // res.sendfile(__dirname + "/reports.json");
      },
  'savedoc' : function savedoc(req, res)
      {
          console.log("savedoc()");

          var filedata = req.body.file;
          filedata = JSON.stringify(JSON.parse(filedata), null, '  ');

          var filename = __dirname + "/saved.json";
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
};

var port = 1338;
var app = express()
    .use(morgan('dev'))
    .get('/',                       handlers.mainpage)
    .get('/files/*',        handlers.files)
    .get('/getdoc',                 handlers.getdoc)
    .post('/savedoc', bodyParser(), handlers.savedoc)
    .get('/favicon.ico', function(req, res){
        res.send(404, 'No favicon');
    })
    .listen(port);
console.log("listening on ", port);

