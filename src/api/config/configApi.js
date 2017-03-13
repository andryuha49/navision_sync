import bearerAuthorize from '../../lib/authorization/bearerAuthorize';

let _router = null;
let _config = null;
let _db = null;

export class ConfigApi{

    constructor(config, db, router) {
        _config = config;
        _router = router;
        _db = db;
    }

    bind() {
        _router.get('/', bearerAuthorize(['admin']), this.getAll);
        _router.get('/:key', bearerAuthorize(['admin']), this.get);
        _router.post('/:key', bearerAuthorize(['admin']), this.post);
        _router.put('/:key', bearerAuthorize(['admin']), this.put);
        _router.delete('/:key', bearerAuthorize(['admin']), this.delete);
        _router.put('/reset/:key', bearerAuthorize(['admin']), this.reset);

        return _router;
    }

    getAll(req, res) {
        _db.Config.find().skip(0).nextObject(function (err, data ) {
            if (err){
                res.status(500).json(err);
            } else {
                res.status(200).json(data || []);
            }
        });
    }

    get(req, res) {
        _db.Config.findOne({key: req.params.key}, function (err, data) {
            if (err){
                res.status(500).json(err);
            } else if(!data) {
                res.status(404).json({message: 'Not found'});
            } else {
                res.status(200).json(data.value);
            }
        });
    }

    post(req, res) {
        _db.Config.findOne({key: req.params.key}, function (err, data) {
            if (err){
                res.status(500).json(err);
            } else if(data) {
                res.status(400).json({message: 'Key is found. Use PUT method.'});
            } else {
                _db.Config.insert({key: req.params.key, value: req.body}, function (err) {
                    if (err) {
                        res.status(500).json(err);
                    } else {
                        res.status(200).end();
                    }
                });
            }
        });
    }

    put(req, res) {
        _db.Config.findOne({key: req.params.key},function (err, data) {
            if (err){
                res.status(500).json(err);
            } else if(!data) {
                res.status(404).json({message: 'Not found'});
            } else {
                _db.Config.update({key: req.params.key}, {key: req.params.key, value: req.body}, function (err) {
                    if (err) {
                        res.status(500).json(err);
                    } else {
                        res.status(200).end();
                    }
                });
            }
        });
    }

    delete(req, res) {
        _db.Config.findAndRemove({key: req.params.key},function (err, data) {
            if (err){
                res.status(500).json(err);
            } else if(!data) {
                res.status(404).json({message: 'Not found'});
            } else {
                res.status(200).end();
            }
        });
    }

    reset(req, res) {
        _db.Config.findOne({key: req.params.key},function (err, data) {
            if (err){
                res.status(500).json(err);
            } else if(!data) {
                res.status(404).json({message: 'Not found'});
            } else {
                _config[req.params.key] = data.value;
                res.status(200).end();
            }
        });
    }
}