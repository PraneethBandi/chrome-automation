var Chrome = require('chrome-remote-interface');
var l = require('lodash');


Chrome(function (chrome) {
    with (chrome) {
        //Page.loadEventFired(close);
        //Network.enable();
        Console.enable();
        Page.enable();
        once('ready', function () {
            Page.navigate({'url': 'https://github.com/fczbkk/css-selector-generator'});
            Page.loadEventFired(function(){
                main(chrome);
            });
        });
    }
}).on('error', function (err) {
    console.error('Cannot connect to Chrome:', err);
});

//var expr = "window.document.querySelector('.is-clearable').getBoundingClientRect()";
var expr = "window.document.querySelector('.octicon').getBoundingClientRect()";

function main(chrome){
    chrome.Runtime.evaluate({
        expression: expr,
        objectGroup: 'console',
        doNotPauseOnExceptionsAndMuteConsole: false,
        includeCommandLineAPI: true,
        generatePreview: true,
        returnByValue: false
    }).then(function (data){
        var y = 0,x = 0;
        if(data && data.result && data.result.preview && data.result.preview.properties){
            var top = l.find(data.result.preview.properties, {name: "top"})
            if(top){
                y = parseInt(top.value,10);
            }
            var left = l.find(data.result.preview.properties, {name: "left"})
            if(left){
                x = parseInt(left.value,10);
            }
            invoke({"X":x,"Y":y}, chrome);
        }
        else{
            console.log("data is null: ", data);
        }
    });
};

function invoke(cords, chrome){
    if(cords.X === 0 && cords.Y === 0){
        return;
    }
    click(chrome, cords.X, cords.Y);
};

function click(chrome, x, y){
    chrome.Input.dispatchMouseEvent({
        type:"mousePressed",
        "x":x,
        "y":y,
        button:"left",
        clickCount:1,
        deviceSpace:true
    }).then(function (){
        chrome.Input.dispatchMouseEvent({
            type:"mouseReleased",
            "x":x,
            "y":y,
            button:"left",
            clickCount:1,
            deviceSpace:true
        });
    });
};