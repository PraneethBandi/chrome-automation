var Chrome = require('chrome-remote-interface');
var l = require('lodash');
var Promise = require('promise');
const readline = require('readline');
const fs = require('fs');
const spawn = require('child_process').spawn;

var steps = [];
var currentStepObj = {};
const rl = readline.createInterface({
  input: fs.createReadStream('steps.txt')
});

rl.on('line', (line) => {
    if (line && line.trim() !== '') {
        console.log('adding line', line);
        steps.push(line);
    }
});

rl.on('close', () => {
    console.log('close');
    console.log('launching chrome...');
    launchChrome();
});

function launchChrome() {
    const bat = spawn('cmd.exe', ['/c', 'launchChrome.bat'], { detached: false, shell: false, env: process.env, encoding : 'utf8' });
    bat.on('exit', (code) => {
        if (code === 0) {
            console.log("initiating test...");
            initiate();
        }
        else {
            console.log(`unable to launch chrome browser, process exited with code ${code}`);
            process.exit(0);
        }
    });
};

function initiate() {
    Chrome(function (chrome) {
        with (chrome) {
            //Page.loadEventFired(close);
            //Network.enable();
            Console.enable();
            Page.enable();
            once('ready', function () {
                Page.navigate({ 'url': 'url' });
                Page.loadEventFired(function () {
                    console.log("load event");
                    dequeueStep(chrome);
                });
            });
        }
    }).on('error', function (err) {
        console.error('Cannot connect to Chrome:', err);
    });
}



function dequeueStep(chrome) {
    var step = steps.shift();
    if (step) {
        console.log(step);
        var items = step.split('||');
        if (items.length > 1) {
            currentStepObj = {
                action: items[0],
                selector: items[1],
                text: items[2]
            }
            console.log("executing", step);
            executeStep(chrome, currentStepObj);
        }
    }
    else {
        console.log("steps done!!!");
        process.exit(0);
    }
}

function executeStep(chrome, stepObj) {
    if (stepObj.action === 'type') {
        invokeAction(chrome, null, stepObj);
    }
    else {
        var expr = getExpression(stepObj.selector);
        invokeExpression(chrome, expr)
            .then(function (cords) {
                invokeAction(chrome, cords, stepObj);
            }).catch(function (error) {
                console.log(error);
            });
    }
}

function invokeAction(chrome, cordinates, stepObj) {
    switch (stepObj.action) {
        case 'click':
            click(chrome, cordinates.X, cordinates.Y)
                .then(function () { 
                    dequeueStep(chrome);
                });
            break;
        case 'type':
            typeString(chrome, stepObj.selector, stepObj.text)
                .then(function () {
                    dequeueStep(chrome);
                });
            break;
    };
};

function getExpression(selector) {
    return "window.document.querySelector('" + selector + "').getBoundingClientRect()";
}

function invokeExpression(chrome, expr) {
    var promise = new Promise(function (sucess, error) {
        chrome.Runtime.evaluate({
            expression: expr,
            objectGroup: 'console',
            doNotPauseOnExceptionsAndMuteConsole: false,
            includeCommandLineAPI: true,
            generatePreview: true,
            returnByValue: false
        }).then(function (data) {
            var y = 0, x = 0, w = 0, h = 0;
            if (data && data.result && data.result.preview && data.result.preview.properties) {
                var top = l.find(data.result.preview.properties, { name: "top" })
                if (top) {
                    y = parseInt(top.value, 10);
                }
                var left = l.find(data.result.preview.properties, { name: "left" })
                if (left) {
                    x = parseInt(left.value, 10);
                }
                var width = l.find(data.result.preview.properties, { name: "width" })
                if (width) {
                    w = parseInt(width.value, 10);
                }
                var height = l.find(data.result.preview.properties, { name: "height" })
                if (height) {
                    h = parseInt(height.value, 10);
                }
                if (w >= 20) {
                    x = parseInt(x + (w / 2), 10);
                }
                if (h >= 10) {
                    y = parseint(y + (h / 2), 10);
                }
                sucess({ "X": x, "Y": y });
            }
            else {
                console.log("data is null: ", data);
                error("data is null");
            }
        }).catch(function (response) {
            error(respose);
        });
    });

    return promise;
};

function typeString(chrome, selector, text) {
    var expr = "window.document.querySelector('" + selector + "').value = '" + text + "'";
    var promise = new Promise(function (sucess, reject) { 
        chrome.Runtime.evaluate({
            expression: expr,
            objectGroup: 'console',
            doNotPauseOnExceptionsAndMuteConsole: false,
            includeCommandLineAPI: true,
            generatePreview: true,
            returnByValue: false
        }).then(function (data) {
            sucess(data);
        }).catch(function (response) {
            error(respose);
        });
    });
    return promise;
}

function click(chrome, x, y) {
    var promise = new Promise(function (sucess, reject) {
        chrome.Input.dispatchMouseEvent({
            type: "mousePressed",
            "x": x,
            "y": y,
            button: "left",
            clickCount: 1,
            deviceSpace: true
        }).then(function () {
            chrome.Input.dispatchMouseEvent({
                type: "mouseReleased",
                "x": x,
                "y": y,
                button: "left",
                clickCount: 1,
                deviceSpace: true
            }).then(function () {
                sucess();
            });
        }).catch(function (error) {
            console.log(error);
            reject(error);
        });
    });
    return promise;
};