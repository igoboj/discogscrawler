
const Apify = require('apify');
const ArtistCrawler = require('./routes/artistCrawler');
const CompositionCrawler = require('./routes/compositionCrawler.js');
const LabelCrawler = require('./routes/labelCrawler.js');
const MasterCrawler = require('./routes/masterCrawler.js');
const ReleaseCrawler = require('./routes/releaseCrawler');
const { utils: { log } } = Apify;

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

let counters = {
    master: 0,
    release: 0,
    composition: 0,
    track: 0,
    artist: 0,
    label: 0
}

let timeOuts = 0;
const timeOutLength = 5;

function createRouter(globalContext) {
    return async function (requestContext) {
        const { $, request } = requestContext;

        if ($('div#page_content > h1').length == 1 && $('div#page_content > h1')[0].children[0].data == "404! Oh no!") {
            log.error(`404 ${request.url}`);
            return () => { };
        }

        if ($('div[id=wrapper]>h3').length == 1 && $('div[id=wrapper]>h3')[0].children[0].data == "Error 429") {
            log.error(`429 ${request.url}`);
            log.error(`Timeout`);
            var waitTill = new Date(new Date().getTime() + timeOutLength * 1000);
            while (waitTill > new Date()) { };
            timeOuts++;
            throw "429_too_many_requests_429";
        }


        const urlArr = request.url.split('/').slice(2);
        let route;

        if (urlArr[2] === "master") {
            counters.master++;
            route = MasterCrawler.crawlMaster;

        } else if (urlArr[2] === "release") {
            counters.release++;
            route = ReleaseCrawler.crawlRelease;

        } else if (urlArr[1] === "track" || urlArr[1] === "composition") {
            counters.track++;
            route = CompositionCrawler.crawlComposition;

        } else if (urlArr[1] === "artist") {
            counters.artist++;
            route = ArtistCrawler.crawlArtist;

        } else if (urlArr[1] === "label") {
            counters.label++;
            route = LabelCrawler.crawlLabel;

        }

        if (!route) {
            log.info(`!!!!!!! No route defined for url ${request.url} !!!!!!!`);
            return () => { };
        } else {

            log.info("Processed: " + JSON.stringify(counters));
            counters.label++;
            return route(requestContext, globalContext);
        }
    }
}

function getTotalTimeoutTime() {
    return timeOuts * timeOutLength;
}

exports.createRouter = createRouter;
exports.getTotalTimeoutTime = getTotalTimeoutTime;