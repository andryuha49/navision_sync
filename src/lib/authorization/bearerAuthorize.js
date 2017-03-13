import passport from 'passport';
import extend from 'node.extend';

export default function bearerAuthorize(roles = [], options = null) {
    return function customCallback(req, res, next) {
        passport.authenticate('bearer', extend({session: false}, options || {}), function (error, user, info) {
            if (error) {
                res.status(500).json(error);
                //return next(null, false, {message: 'Token expired'});
                //return next(error);
            } else if (!user) {
                // info containing default error messages or your defined ones.
                return res.status(401).json({message: 'Unauthorized'});
                //return next('Unknown user', false, {message: 'Unknown user'});;
            } else if (roles && roles.length > 0) {
                if(!user.roles || user.roles.length < 1) {
                    return res.status(401).json({message: 'Unauthorized'});
                }
                for(let i = 0; i < roles.length; i++) {
                    if(user.roles.indexOf(roles[i]) >= 0) {
                        return next();
                    }
                }

                return res.status(401).json({message: 'Unauthorized'});
            } else {
                return next();
            }
        })(req, res, next);
    }
}