#!/usr/bin/env node
'use strict';
/**
 * cli универсального фреймворка umbot для создания голосовых навыков и чат-ботов для различных платформ.
 * Скрипт позволяет создавать готовые шаблоны для вашего приложения.
 * @version 3.0.0
 * @author Maxim-M maximco36895@yandex.ru
 * @module
 */

const consoleController = require(__dirname + '/controllers/ConsoleController.js');
const utils = require(__dirname + '/utils.js').utils;

const argv = process.argv;

const param = {};
if (argv[2]) {
    param.command = argv[2].toLowerCase();
    param.hostname = 'localhost';
    param.port = 3000;
    if (argv[3]) {
        if (argv[3].indexOf('.json') !== -1) {
            if (utils.isFile(argv[3])) {
                const jsonParam = JSON.parse(utils.fread(argv[3]));
                param.appName = jsonParam.name;
                param.params = jsonParam;
                if (jsonParam.hostname) {
                    param.hostname = jsonParam.hostname;
                }
                if (jsonParam.port) {
                    param.port = jsonParam.port;
                }
            }
        } else {
            param.appName = argv[3];
        }
    }
}
consoleController.main(param, argv);
process.exitCode = 1;
