var Service = require('node-windows').Service;
var config = require('../config.json');

// Create a new service object
var svc = new Service(config.windowsService);
svc.user.domain = config.windowsService.user.domain;
svc.user.account = config.windowsService.user.account;
svc.user.password = config.windowsService.user.password;

svc.restart();