import bearerAuthorize from '../../lib/authorization/bearerAuthorize';

let _router = null;
let _config = null;
let _db = null;

export class AddressApi {

    constructor(config, db, router) {
        _config = config;
        _router = router;
        _db = db;
    }

    bind() {
        _router.get('/', bearerAuthorize(), this.get);
        _router.post('/', bearerAuthorize(), this.post);
        _router.put('/', bearerAuthorize(), this.put);
        _router.delete('/', bearerAuthorize(), this.delete);

        return _router;
    }

    get(req, res) {

    }

    post(req, res) {

    }

    put(req, res) {

    }

    delete(req, res) {

    }
}