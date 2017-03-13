import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initializeDb from './db';

import { Database } from './data/database';

import middleware from './middleware';
import api from './api';
import config from './config.json';
import passport from 'passport';

let app = express();
app.server = http.createServer(app);

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(bodyParser.json({
	limit : config.bodyLimit
}));

app.use(passport.initialize());


let mapConfig = function(defaultConfig, db) {
	db.Config.findOne({key: 'smtp'}, function(err, smtp){
		if(!err && smtp !== null) {
			defaultConfig.smtp = smtp.value;
		}
	});
};

// connect to db
initializeDb( db => {
	db = new Database(config.tingoDb);

	mapConfig(config, db);

	// internal middleware
	app.use(middleware({ config, db }));

	// api router
	app.use('/api', api({ config, db }));

	app.server.listen(process.env.PORT || config.port);

	console.log(`Started on port ${app.server.address().port}`);
});

export default app;
