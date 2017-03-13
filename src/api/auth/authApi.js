import {Router} from 'express';
import jwt from 'jsonwebtoken';

import bearerAuthorize from '../../lib/authorization/bearerAuthorize';
import {Crypto} from '../../lib/crypto';
import {ValidateModelsService} from './services/validateModelsService';
import {UserViewModel} from './models/userViewModel';
import nodemailer from 'nodemailer';

let _router = null;
let _config = null;
let _db = null;
let _validateService = null;
let _crypto = null;

let getPasswordHash = (password, salt) => {
    return _crypto.sha512(password, salt || _config.serverSecret);
};

let generatePassword = (length = 8) => {
    let charset = 'abdefghijklmnpqrstuvwxyzABDEFGHIJKLMNPQRSTUVWXYZ123456789',
        retVal = '';
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

let getToken = function(request) {
    let authorization = request.headers.authorization;
    if (authorization) {
        return authorization.split(' ')[1];
    }

    if (request.query && request.query.access_token) {
        return request.query.access_token;
    }
    return null;
};

export class AuthApi {

    constructor(config, db, router) {
        _config = config;
        _router = router;
        _db = db;

        _validateService = new ValidateModelsService();
        _crypto = new Crypto();
    }

    bind() {
        _router.post('/login', this.login);
        _router.get('/logout', bearerAuthorize(), this.logout);
        _router.post('/register', this.register);
        _router.post('/restorePassword', this.restorePassword);
        _router.get('/userInfo', bearerAuthorize(), this.userInfo);

        return _router;
    }

    login(req, res) {
        let loginModel = req.body;

        if (!_validateService.validateLoginModel(loginModel)) {
            res.status(500).json({errorMessage: 'Invalid login model'});
        } else {
            //return res.status(404).json({errorMessage: 'Hallo2333'});
            _db.Users.findOne({login: loginModel.login}, function (err, user) {
                if (err !== null) {
                    res.status(500).json(err);
                } else if (user == null) {
                    res.status(404).json({errorMessage: 'User not found'});
                } else {
                    let passwordHash = getPasswordHash(loginModel.password);
                    if (passwordHash !== user.passwordHash) {
                        res.status(404).json({errorMessage: 'User not found'});
                    } else if (user.isLocked) {
                        res.status(403).json({errorMessage: 'User is locked'});
                    } else {
                        let date = Date.now();
                        let token = jwt.sign({
                            login: user.login,
                            created: date
                        }, _config.serverSecret);

                        _db.AccessTokens.insert(
                            [{login: user.login, created: date, token: token}],
                            {w: 1},
                            function (err) {
                                if (err !== null) {
                                    res.status(500).json(err);
                                } else {
                                    res.status(200).json({
                                        access_token: token,
                                        token_type: 'bearer',
                                        expires_in: _config.security.tokenLife,
                                        created_date: date
                                    });
                                }
                            }
                        );
                    }
                }
            });
        }
    }

    logout(req, res) {
        let token = this::getToken(req);
        _db.AccessTokens.remove({token: token}, function (err) {
            if (err) {
                res.status(500).json(err);
            } else {
                res.status(200).end();
            }
        });
    }

    register(req, res) {
        let registerModel = req.body;

        if (!_validateService.validateRegisterModel(registerModel)) {
            res.status(500).json({errorMessage: 'Invalid registration model'});
        } else {
            _db.Users.findOne({login: registerModel.login}, function (err, item) {
                if (err !== null) {
                    res.status(500).json(err);
                } else if (item !== null) {
                    res.status(500).json({errorMessage: 'User already exist'});
                } else {
                    registerModel.passwordHash = getPasswordHash(registerModel.password);
                    registerModel.password = null;
                    registerModel.createdDate = Date.now();
                    registerModel.isLocked = false;
                    if(registerModel.login.toLowerCase() === 'admin') {
                        registerModel.roles = ['admin'];
                    }

                    _db.Users.insert(registerModel, {w: 1}, function (err, result) {
                        if (err !== null) {
                            res.status(500).json(err);
                        } else {
                            res.status(200).json(new UserViewModel(result[0]));
                        }
                    });
                }
            });
        }
    }

    restorePassword(req, res) {
        let email = req.body.email;
        if (!email) {
            res.status(500).json({errorMessage: 'Email is required'});
        } else
            _db.Users.findOne({email: email}, function (err, user) {
                if (err !== null) {
                    res.status(500).json(err);
                } else if (user == null) {
                    res.status(404).json({errorMessage: 'User not found'});
                } else {
                    let newPassword = this::generatePassword();
                    user.passwordHash = this::getPasswordHash(newPassword, user.login);
                    _db.Users.update({login:user.login}, user,{ upsert: false }, function(err) {
                        if (err !== null) {
                            res.status(500).json(err);
                        } else {

                            let transporter = nodemailer.createTransport(_config.smtp);

                            var mailOptions = {
                                from: '"es auction" <noreplay.' + _config.smtp.sender + '>', // sender address
                                to: user.email, // list of receivers
                                subject: 'ES AUCTION: restore password', // Subject line
                                text: 'Hello world 🐴', // plaintext body
                                html: 'Hello!<br>You have new login password: <b>' + newPassword + '</b> .' // html body
                            };

                            // send mail with defined transport object
                            transporter.sendMail(mailOptions, function(error, info){
                                if(error){
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + user.email + ' ' + info.response);
                            });

                            res.status(200).json({message: 'New password was sent on email'});
                        }
                    });

                }
            });
    }


    userInfo(req, res) {
        res.status(200).json(new UserViewModel(req.user));
    }
}

