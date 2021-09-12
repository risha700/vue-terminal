 var express = require('express');
 var expressWs = require('express-ws');
 var os = require('os');
 var pty = require('node-pty');
 var cors = require('cors')
 var fs = require('fs')
 var https = require('https')

 const USE_BINARY = os.platform() !== "win32";
 
 function startServer() {
   var app = express();
   let server = https.createServer({
    key: fs.readFileSync('../cert/server.key'),
    cert: fs.readFileSync('../cert/server.crt')
    }, app) 
   expressWs(app, server);

    app.use(cors())
    app.options('*', cors())
   var terminals = {},
       logs = {};

   app.post('/terminals', (req, res) => {

     const env = Object.assign({}, process.env);
     env['COLORTERM'] = 'truecolor';
     var cols = parseInt(req.query.cols),
       rows = parseInt(req.query.rows),
       term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
         name: 'xterm-256color',
         cols: cols || 80,
         rows: rows || 24,
         cwd: process.platform === 'win32' ? undefined : env.PWD,
         env: env,
         encoding: USE_BINARY ? null : 'utf8'
       });
 
     console.log('Created terminal with PID: ' + term.pid);
     terminals[term.pid] = term;
     logs[term.pid] = '';
     term.onData(function(data) {
       logs[term.pid] += data;
     });
     res.json({pid:term.pid.toString()});
     res.end();
   });
 
   app.post('/terminals/:pid/size', (req, res) => {
     var pid = parseInt(req.params.pid),
         cols = parseInt(req.query.cols),
         rows = parseInt(req.query.rows),
         term = terminals[pid];
 
     term.resize(cols, rows);
     console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
     res.end();
   });
 
   app.ws('/terminals/:pid', function (wss, req) {
     var term = terminals[parseInt(req.params.pid)];
     console.log('Connected to terminal ' + term.pid);

     wss.send(logs[term.pid]);
     term.on('data',function(data) {
       try {
          wss.send(data);
       } catch (ex) {
         wss.send(ex.stderr);
       }
     });
     wss.on('message', function(msg) {
       term.write(msg.toString());
     });
     wss.on('close', function () {
       term.kill();
       // Clean things up
       delete terminals[term.pid];
       delete logs[term.pid];
     });
   });


 
   var port = process.env.PORT || 3000,
       host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';
 
   
  
  server.listen(port, host, ()=>{
        console.log('App listening to https://127.0.0.1:' + port);
  });
 }
 
startServer()