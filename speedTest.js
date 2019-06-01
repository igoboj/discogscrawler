const { PerformanceObserver, performance } = require('perf_hooks');
var fs = require('fs');
 
var stringToParse = fs.readFileSync('string.txt').toString();

function doSomething1() {
    var data = stringToParse;
    var t0 = performance.now();
    var index = data.indexOf("apiServer");    
    var t1 = performance.now();    
    var sliced = "{\""+data.slice(index, -1).trim().slice(0,-1)
    var t2 = performance.now();
    var dsData = JSON.parse(sliced);
    var t3 = performance.now();

    
    console.log("Call to index took " + (t1 - t0) + " milliseconds.");
    console.log("Call to slice took " + (t2 - t1) + " milliseconds.");
    console.log("Call to parse took " + (t3 - t2) + " milliseconds.");
    console.log(dsData.pageObject.objectType)
}

function doSomething2() {
    var data = stringToParse;
    var dsData = JSON.parse(data.trim().slice(1,-7).trim())
    console.log(dsData.pageObject.objectType)
}

{
    var t0 = performance.now();

    doSomething1();   // <---- The function you're measuring time for 

    var t1 = performance.now();
    console.log("Call to doSomething1 took " + (t1 - t0) + " milliseconds.")
    t0 = performance.now();

    doSomething2();   // <---- The function you're measuring time for 

    t1 = performance.now();
    console.log("Call to doSomething2 took " + (t1 - t0) + " milliseconds.")
}