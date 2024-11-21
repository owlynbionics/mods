var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Route to serve the client HTML
app.get('/log-viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let lastPosition = 0;

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${data}\n\n`);
    };

    const readNewLines = () => {
        const stats = fs.statSync(path.join(__dirname, 'chat.log'));
        if (stats.size > lastPosition) {
            const readStream = fs.createReadStream(path.join(__dirname, 'chat.log'), {
                start: lastPosition,
                encoding: 'utf8'
            });

            readStream.on('data', (chunk) => {
                lastPosition += chunk.length;

                const lines = chunk.split('\n');
                lines.forEach((line) => {
                    if (line.trim() !== '') {
                        sendEvent(line);
                    }
                });
            });

            readStream.on('end', () => {
                readStream.destroy();
            });

            readStream.on('error', (err) => {
                console.error('Error reading chat.log:', err);
            });
        }
    };

    readNewLines();

    setInterval(readNewLines, 5000);

    req.on('close', () => {
        console.log('Client disconnected');
    });
});


module.exports = app;