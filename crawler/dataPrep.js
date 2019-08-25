const DBContext = require('./dbContext');
const log = require("./log");
var fs = require('fs');

//// Prepares the data by saving each row as a comma sepparated value
//// The first row contains the #rowCount #featureCount
//// The second row contains the names of the features and their type, all sepparated by commas
(async () => {
    log.info("Initializing.");
    let connectionPool = await DBContext.initialize();
    let releases = await DBContext.getReleases(connectionPool);
    let fileOutput = "";
    var stream = fs.createWriteStream('dataset.txt', { flags: 'w' });

    log.info("Started writing data.");
    log.info(`Rows: ${releases.length}; Features: 2`);


    for (i = 0; i < releases.length; i++) {
        if (!(i % 5000)) {
            log.info(`Saved ${i} rows`);
        }
        let releaseInfo = releases[i];
        let features = Object.keys(releaseInfo);
        if (i == 0) {
            stream.write(`${releases.length} ${features.length}\n`);
            features.forEach(feature => {
                stream.write(`${feature} ${typeof releaseInfo[feature]}, `);
            });
            stream.write("\n");
        }
        features.forEach(feature => {
            stream.write(`${releaseInfo[feature]}, `);
        });
        stream.write("\n");
    }

    log.info("Finished writing data.");
    connectionPool.close();
})();