const sql = require("mssql");
var fs = require('fs');
const log = require("./log");

(async () => {
    var config = {
        user: 'sa',
        password: 'Password1!',
        server: 'localhost',
        database: 'discogs',
        pool: {
            max: 100,
            min: 1
        }
    };

    log.info("Initializing.");
    const connectionPoolPromise = new sql.ConnectionPool(config);
    connectionPoolPromise.on('error', (err) => {
        if (err) console.log(err);
    });
    await connectionPoolPromise.connect();

    let releases = await getReleases(connectionPoolPromise);
    let fileOutput = "";
    var stream = fs.createWriteStream('dataset.txt', { flags: 'w' });
    
    log.info("Started writing data.");
    log.info(`Rows: ${releases.length}; Features: 2`);

    stream.write(`${releases.length} 2\n`);
    
    for (i = 0; i < releases.length; i++) {
        if(!(i%5000)) {
            log.info(`Saved ${i} rows`);
        }
        let dataPoint = `${releases[i].Format}, ${releases[i].Published}\n`;
        stream.write(dataPoint);
    }

    log.info("Finished writing data.");
    connectionPoolPromise.close();
})();

async function getReleases(connectionPool) {
    log.info("Fetching Releases.");
    const sqlRequest = connectionPool.request();
    return await sqlRequest
        .query('SELECT Published, Format FROM Release')
        .then(async result => {
            if (result.recordset.length != 0) {
                return result.recordset;
            }
        })
        .catch(err => {
            log.error(`Error while getting data: ${err.message}`);
        });
}