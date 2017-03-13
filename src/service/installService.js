var Service = require('node-windows').Service;
var config = require('../config.json');

// Create a new service object
var svc = new Service(config.windowsService);
if(config.windowsService.user) {
  svc.user.domain = config.windowsService.user.domain || null;
  svc.user.account = config.windowsService.user.account || null;
  svc.user.password = config.windowsService.user.password || null;
}
// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

if (svc.exists){
  svc.start();
} else {
  svc.install();
}
