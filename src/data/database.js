import tingoDb from 'tingodb';

export class Database {
    database = null;

    Config = [];

    Users = [];
    AccessTokens = [];

    constructor(config) {
        let tDb = new tingoDb().Db;
        let db = new tDb(config.path, {});

        this.Users = db.collection('users.json');
        this.AccessTokens = db.collection('accessTokens.json');

        this.Config = db.collection('config.json');
    }
}