import {version} from '../../package.json';
import {Router} from 'express';

import passport from 'passport';
import BearerStrategy from 'passport-http-bearer';

import facets from './facets';

//import {AuthApi} from './auth/authApi';
//import {ConfigApi} from './config/configApi';
//import {ProfileApi} from './user/profileApi';
//import {AddressApi} from './user/addressApi';

import {OrdersApi} from './orders/ordersApi';

let getJwtStrategy = function (config, db) {
    return function (accessToken, done) {
        db.AccessTokens.findOne({token: accessToken}, function (err, token) {
            if (err) {
                return done(err);
            }
            if (!token) {
                return done(null, false);
            }

            if (Math.round((Date.now() - token.created) / 1000) > config.security.tokenLife) {
                db.AccessTokens.remove({token: accessToken}, function (err) {
                    if (err) return done(err);
                });
                return done(null, false, {message: 'Token expired'});
            }

            db.Users.findOne({login: token.login}, function (err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, {message: 'Unknown user'});
                }

                var info = {scope: '*'};
                return done(null, user, info);
            });
        });
    }
};

export default ({config, db}) => {
    let router = Router();

    passport.use(new BearerStrategy(this::getJwtStrategy(config, db)));

    // mount the facets resource
    router.use('/facets', facets({config, db}));

    router.use('/orders', new OrdersApi(config, new Router()).bind());

    //router.use('/auth', new AuthApi(config, db, new Router()).bind());
    //router.use('/config', new ConfigApi(config, db, new Router()).bind());
    //router.use('/user/profile', new ProfileApi(config, db, new Router()).bind());
    //router.use('/user/address', new AddressApi(config, db, new Router()).bind());

    // perhaps expose some API metadata at the root
    router.get('/', (req, res) => {
        res.json({version});
    });

    return router;
}
