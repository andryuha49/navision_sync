import bearerAuthorize from '../../lib/authorization/bearerAuthorize';
import nodemailer from 'nodemailer';
import {Crypto} from '../../lib/crypto';

let _router = null;
let _config = null;
let _db = null;

let _crypto = null;

let getPasswordHash = (password, salt) => {
    return _crypto.sha512(password, salt || _config.serverSecret);
};

let sendDeleteProfileEmail = function(email) {
    let transporter = nodemailer.createTransport(_config.smtp);
    var mailOptions = {
        from: '"es auction" <noreplay.' + _config.smtp.sender + '>', // sender address
        to: email, // list of receivers
        subject: 'ES AUCTION: profile deleted', // Subject line
        text: 'Hello world ', // plaintext body
        html: 'Hello!<br>You profile was deleted.<br>Be happy!' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + email + ' ' + info.response);
    });
};

export class ProfileApi {

    constructor(config, db, router) {
        _config = config;
        _router = router;
        _db = db;

        _crypto = new Crypto();
    }

    bind() {
        _router.get('/', bearerAuthorize(), this.get);
        _router.post('/', bearerAuthorize(), this.post);
        _router.delete('/', bearerAuthorize(), this.delete);
        _router.post('/changePassword', bearerAuthorize(), this.changePassword);

        return _router;
    }

    get(req, res) {

    }

    post(req, res) {

    }

    delete(req, res) {
        _db.Users.findOne({login: req.user.login}, function (err, user) {
            if (err){
                res.status(500).json(err);
            } else if(!user) {
                res.status(404).json({message: 'Not found'});
            } else {
                user.isLocked = true;
                user.isDeleted = true;
                _db.Users.update({login: user.login}, user, function(err) {
                    if (err) {
                        res.status(500).json(err);
                    } else {
                        this::sendDeleteProfileEmail(user.email);
                        res.status(200).end();
                    }
                });
            }
        });
    }

    changePassword(req, res) {
        _db.Users.findOne({login: req.user.login}, function (err, user) {
            if (err !== null) {
                res.status(500).json(err);
            } else if (user == null) {
                res.status(404).json({errorMessage: 'User not found'});
            } else {
                let newPassword = req.body.newPassword;
                user.passwordHash = this::getPasswordHash(newPassword, user.login);
                _db.Users.update({login:user.login}, user,{ upsert: false }, function() {
                    if (err !== null) {
                        res.status(500).json(err);
                    } else {
                        res.status(200).end();
                    }

                });
            }
        });
    }
}