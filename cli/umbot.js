#!/usr/bin/env node
'use strict';
/**
 * Универсальное приложение по созданию навыков и ботов.
 * Скрипт позволяет создавать шаблон для приложения.
 * @version 1.0.1
 * @author Maxim-M maximco36895@yandex.ru
 * @module
 */

const consoleController = require('./controllers/ConsoleController');
const utils = require('./utils').utils;

const argv = process.argv;

const param = {};
if (argv[2]) {
    param.command = argv[2].toLowerCase();
    if (argv[3]) {
        if (argv[3].indexOf('.json') !== -1) {
            if (utils.isFile(argv[3])) {
                const jsonParam = JSON.parse(utils.fread(argv[3]));
                param.appName = jsonParam.name;
                param.params = jsonParam;
            }
        } else {
            param.appName = argv[3];
        }
    }
}
consoleController.main(param);
process.exitCode = 1;
