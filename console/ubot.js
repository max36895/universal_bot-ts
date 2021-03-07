#!/usr/bin/env node
'use strict';
/**
 * Универсальное приложение по созданию навыков и ботов.
 * Скрипт позволяет создавать шаблон для приложения.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */

const consoleController = require('./controllers/ConsoleController');
const utils = require('./utils').utils;

const argv = process.argv;

const param = {};
if (argv[2]) {
    param.command = argv[2].toLowerCase();
    if (argv[3]) {
        if (argv[3].indexOf('.json') !== -1) {
            if (utils.is_file(argv[3])) {
                const jsonParam = utils.fread(argv[3]);
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

/**
 * Консольный скрипт
 * =================
 * Назначение
 * ----------
 * Скрипт предназначен для быстрого создания приложения.
 * Он способен создать шаблон приложения.
 * Использование
 * -------------
 * Чтобы воспользоваться скриптом, запустите файл ubot.js, и передайте необходимые параметры.
 * ```bash
 * npm ubot ...
 * ```
 *
 * Комманды
 * --------
 * На данный момент поддерживаются 1 команда:
 * - create - Создать приект
 *
 * При создании проекта, в качестве 2 параметра нужно передать либо название проекта на английском языке, либо json файл с конфигурацией.
 * При передаче json файла, можно создать шаблон приложения определенного типа. Сейчас поддерживается `quiz` - викторина, и пустой проект.
 *
 * Пример json файла
 * -----------------
 * ```json
 * {
 *   "name": "Название проекта (*)",
 *   "type": "Тип проекта. default, quiz",
 *   "config": ["Конфигурация для подключения к бд. Структуру смотри в mmApp.config"],
 *   "params": ["Параметры приложения. Структуру смотри в mmApp.params"],
 *   "path": "Директория, в которой будет создан проект. По умолчанию, проект создается в папке и именем проекта, в дирректории запуска спкипта."
 * }
 * ```
 * '*' - обозначены обязательные поля.
 *
 * Пример использования
 * --------------------
 * Создание пустого проекта:
 * ```bash
 * npm ubot create project
 * ```
 * Создание проекта, используя в качестве параметра json
 * ```json
 * {
 *   "name": "project",
 *   "type": "quiz"
 * }
 * ```
 * ```bash
 * npm ubot create project.json
 * ```
 */
