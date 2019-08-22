
const sql = require("mssql");
const log = require("./log");
const HashMap = require('hashmap');


let genres = new HashMap();
let styles = new HashMap();

async function initialize(connectionPool) {
    let sqlRequest = connectionPool.request();
    await sqlRequest
        .query('SELECT * FROM Genre')
        .then(async result => {
            if (result.recordset.length != 0) {
                for (i = 0; i < result.recordset.length; i++) {
                    genres.set(result.recordset[i].GenreName, true);
                }
            }
        })
        .catch(err => {
            log.error(`Error while retrieving Genres: ${err.message}`);
        });

    sqlRequest = connectionPool.request();
    await sqlRequest
        .query('SELECT * FROM Style')
        .then(async result => {
            if (result.recordset.length != 0) {
                for (i = 0; i < result.recordset.length; i++) {
                    styles.set(result.recordset[i].StyleName, true);
                }
            }
        })
        .catch(err => {
            log.error(`Error while retrieving Styles: ${err.message}`);
        });
}

async function insertRelease(connectionPool, releaseInfo) {

    const sqlRequest = connectionPool.request();
    await sqlRequest
        .input('id', sql.Int, releaseInfo.id)
        .input('have', sql.Int, releaseInfo.have || 0)
        .input('want', sql.Int, releaseInfo.want || 0)
        .input('published', sql.Int, releaseInfo.datePublished)
        .input('name', sql.NVarChar, releaseInfo.name)
        .input('trackCount', sql.Int, releaseInfo.numTracks)
        .input('description', sql.NVarChar, releaseInfo.description)
        .input('ratingCount', sql.Int, releaseInfo.rating ? releaseInfo.rating.ratingCount : 0)
        .input('ratingValue', sql.Float, releaseInfo.rating ? releaseInfo.rating.ratingValue : 0)
        .input('format', sql.NVarChar, releaseInfo.format)
        .input('country', sql.NVarChar, releaseInfo.country)
        .input('duration', sql.Int, releaseInfo.releaseDuration)
        .input('masterId', sql.Int, releaseInfo.masterId)
        .query('INSERT INTO Release ([IdRelease],[Have],[Want],[Published],[Name],[TrackCount],[Description],[RatingCount],[RatingValue],[Format],[Country],[Duration],[IdMaster]) ' +
            'VALUES(@id,@have,@want,@published,@name,@trackCount,@description,@ratingCount,@ratingValue,@format,@country,@duration,@masterId)')
        .then(result => {
            log.info(`Inserted row in Release: ${result.rowsAffected}`);
        })
        .catch(err => {
            log.error(`Error while inserting row in Release: ${err.message}`);
        });

    if (releaseInfo.genres) {
        for (irgenre = 0; irgenre < releaseInfo.genres.length; irgenre++) {
            await insertGenre(connectionPool, releaseInfo.genres[irgenre]);
            await insertGenresStyles(connectionPool, "ReleaseGenre", false, releaseInfo.genres[irgenre], releaseInfo.id);
        }
    }

    if (releaseInfo.styles) {
        for (irstyle = 0; irstyle < releaseInfo.styles.length; irstyle++) {
            await insertStyle(connectionPool, releaseInfo.styles[irstyle]);
            await insertGenresStyles(connectionPool, "ReleaseStyle", false, releaseInfo.styles[irstyle], releaseInfo.id);
        }
    }
}

async function insertOrUpdateMaster(connectionPool, masterInfo) {
    let sqlRequest = connectionPool.request();
    sqlRequest
        .input('id', sql.Int, masterInfo.id)
        .input('have', sql.Int, masterInfo.have)
        .input('want', sql.Int, masterInfo.want)
        .input('published', sql.Int, masterInfo.datePublished)
        .input('name', sql.NVarChar, masterInfo.name)
        .input('trackCount', sql.Int, masterInfo.numTracks)
        .query('INSERT INTO Master VALUES(@id,@have,@want,@published,@name,@trackCount)')
        .then(result => {
            log.info(`Inserted row in Master: ${result.rowsAffected}`);
        })
        .catch(async (err) => {
            log.error(`Error while inserting row in Master: ${err.message}`);
            if (err.message.includes("Violation of PRIMARY KEY constraint") && masterInfo.name) {
                // Try to update existing empty master
                const sqlRequest = connectionPool.request();
                await sqlRequest
                    .input('masterId', sql.Int, masterInfo.id)
                    .query('SELECT * FROM Master WHERE IdMaster=@masterId')
                    .then(async result => {
                        if (result.recordset.length != 0 && result.recordset[0].Name == "") {
                            const masterRequest = connectionPool.request();
                            await masterRequest
                                .input('id', sql.Int, masterInfo.id)
                                .input('have', sql.Int, masterInfo.have)
                                .input('want', sql.Int, masterInfo.want)
                                .input('published', sql.Int, masterInfo.datePublished)
                                .input('name', sql.NVarChar, masterInfo.name)
                                .input('trackCount', sql.Int, masterInfo.numTracks)
                                .query('UPDATE Master SET [Have]=@have,[Want]=@want,[Published]=@published,[Name]=@name,[TrackCount]=@trackCount WHERE IdMaster=@id')
                                .then(result => {
                                    log.info(`Updated empty Master: ${result.rowsAffected}`);
                                })
                                .catch(err => {
                                    log.error(`Error while updating empty in Master: ${err.message}`);
                                });
                        }
                    })
                    .catch(err => {
                        log.error(`Error while inserting row in Master: ${err.message}`);
                    });
            }
        });

    if (masterInfo.genres) {
        for (imgenre = 0; imgenre < masterInfo.genres.length; imgenre++) {
            await insertGenre(connectionPool, masterInfo.genres[imgenre]);
            await insertGenresStyles(connectionPool, "MasterGenre", true, masterInfo.genres[imgenre], masterInfo.id);
        }
    }

    if (masterInfo.styles) {
        for (imstyle = 0; imstyle < masterInfo.styles.length; imstyle++) {
            await insertStyle(connectionPool, masterInfo.styles[imstyle]);
            await insertGenresStyles(connectionPool, "MasterStyle", true, masterInfo.styles[imstyle], masterInfo.id);
        }
    }
}

async function getMaster(connectionPool, masterId) {
    const sqlRequest = connectionPool.request();
    return await sqlRequest
        .input('masterId', sql.Int, masterId)
        .query('SELECT * FROM Master WHERE IdMaster=@masterId')
        .then(async result => {
            if (result.recordset.length != 0) {
                return result.recordset[0];
            }
        })
        .catch(err => {
            log.error(`Error while inserting row in Master: ${err.message}`);
        });
}


async function insertGenresStyles(connectionPool, tableName, isMaster, name, id) {
    const sqlRequest = connectionPool.request();
    let values = isMaster ? "@name, @id" : "@id, @name";
    await sqlRequest
        .input('name', sql.NVarChar, name)
        .input('id', sql.Int, id)
        .query(`INSERT INTO ${tableName} VALUES(${values})`)
        .then(result => {
            log.info(`Inserted row in ${tableName}: ${id}:${name}`);
        })
        .catch(async (err) => {
            log.error(`Error while inserting row in ${tableName}: ${err.message}`);
        });
}

async function insertGenre(connectionPool, genreName) {
    let genre = genres.get(genreName)
    if (!genre) {
        genres.set(genreName, true);
        const sqlRequest = connectionPool.request();
        await sqlRequest
            .input('name', sql.NVarChar, genreName)
            .query('INSERT INTO Genre VALUES(@name)')
            .then(result => {
                log.info(`Inserted row in Genre: ${genreName}`);
            })
            .catch(async (err) => {
                log.error(`Error while inserting row in Genre: ${err.message}`);
            });
    }
}

async function insertStyle(connectionPool, styleName) {
    let style = styles.get(styleName)
    if (!style) {
        styles.set(styleName, true);
        const sqlRequest = connectionPool.request();
        await sqlRequest
            .input('name', sql.NVarChar, styleName)
            .query('INSERT INTO Style VALUES(@name)')
            .then(result => {
                log.info(`Inserted row in Style: ${styleName}`);
            })
            .catch(async (err) => {
                log.error(`Error while inserting row in Style: ${err.message}`);
            });
    }
}

exports.insertOrUpdateMaster = insertOrUpdateMaster;
exports.insertRelease = insertRelease;
exports.initialize = initialize;
exports.getMaster = getMaster;