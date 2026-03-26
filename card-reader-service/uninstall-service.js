'use strict';

var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
    name:   'CardReader-NETEnergy',
    script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', function () {
    console.log('[OK] Service removed successfully.');
    setTimeout(function () { process.exit(0); }, 1000);
});

svc.on('error', function (err) {
    console.error('[ERROR]', err);
    process.exit(1);
});

console.log('Removing Windows service...');
svc.uninstall();
