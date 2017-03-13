var Service = require('node-windows').Service;
var config = require('../config.json');

// Create a new service object
var svc = new Service(config.windowsService);

// Uninstall the service.
svc.stop();