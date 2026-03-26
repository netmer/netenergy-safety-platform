'use strict';

/**
 * Registers the card reader as a Windows Service.
 * Requires Administrator privileges.
 * Run via: node install-service.js
 */

var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
    name:        'CardReader-NETEnergy',
    description: 'Thai ID Card Reader Service for NET Energy ERP (port 38080)',
    script:      path.join(__dirname, 'server.js'),
    // Restart service automatically if it crashes
    maxRestarts: 5,
    wait:        2,
    grow:        0.5,
});

svc.on('install', function () {
    console.log('[OK] Windows service installed.');
    svc.start();
    console.log('[OK] Service started. It will run automatically on every Windows startup.');
    setTimeout(function () { process.exit(0); }, 2000);
});

svc.on('alreadyinstalled', function () {
    console.log('[INFO] Service already installed. Starting...');
    svc.start();
    setTimeout(function () { process.exit(0); }, 2000);
});

svc.on('start', function () {
    console.log('[OK] Service is running on http://localhost:38080');
});

svc.on('error', function (err) {
    console.error('[ERROR]', err);
    process.exit(1);
});

console.log('Installing Windows service...');
svc.install();
