'use strict';
const fs = require('fs');
const { exec } = require('child_process');
const utils = require(__dirname + '/../utils').utils;

/**
 * Класс, создающий пустой проект, или шаблон для готового проекта.
 */
class CreateController {
    /**
     * Создает пустой проект
     * @type {string}
     */
    static T_DEFAULT = 'Default';
    /**
     * Создает викторину
     * @type {string}
     */
    static T_QUIZ = 'Quiz';

    #path;
    #name;
    /**
     * Параметры для создания приложения
     */
    params;

    /**
     * Читает содержимое файла
     * @param {string} file Путь к файлу
     * @returns {string} Содержимое файла или пустая строка
     * @private
     */
    _getFileContent(file) {
        let content = '';
        if (file && utils.isFile(file)) {
            content = utils.fread(file);
        }
        return content;
    }

    /**
     * Формирует заголовок файла с информацией о создании
     * @returns {string} Заголовок файла
     * @private
     */
    _getHeaderContent() {
        let headerContent = '/*\n';
        headerContent += '/* Created by umbot\n';
        headerContent += ' * Date: {{date}}\n';
        headerContent += ' * Time: {{time}}\n';
        headerContent += ' */\n\n';
        return headerContent;
    }

    /**
     * Инициализирует параметры приложения
     * @param defaultParams
     * @returns {string}
     * @private
     */
    _initParams(defaultParams) {
        let params;
        if (this.params && this.params.params) {
            params = { ...defaultParams, ...this.params.params };
        } else {
            params = defaultParams;
        }

        let content = this._getHeaderContent();
        content += "import { IAppParam } from 'umbot';\n\n";
        content += 'export default function(): IAppParam {\n';
        content += '\treturn ';
        content += JSON.stringify(params, null, '\t');
        content += ';\n';
        content += '}\n';

        return content;
    }

    /**
     * Инициализирует конфигурации приложения
     * @param defaultConfig
     * @returns {string}
     * @private
     */
    _initConfig(defaultConfig) {
        let config;
        if (this.params.config) {
            config = { ...defaultConfig, ...this.params.config };
        } else {
            config = defaultConfig;
        }
        if (this.params.isEnv) {
            config.env = `./.env`;
        }
        let content = this._getHeaderContent();
        content += "import { IAppConfig } from 'umbot';\n\n";
        content += 'export default function (): IAppConfig {\n';
        content += '\treturn ';
        content += JSON.stringify(config, null, '\t');
        content += ';\n';
        content += '}\n';

        return content;
    }

    /**
     * Заменяет все вхождения подстрок в строке
     * @param {string|string[]} find Строка или массив строк для поиска
     * @param {string|string[]} replace Строка или массив строк для замены
     * @param {string} str Исходная строка
     * @returns {string} Строка с произведенными заменами
     * @private
     */
    _replace(find, replace, str) {
        if (typeof find === 'string') {
            return str.replace(new RegExp(find, 'g'), replace);
        } else {
            let res = str;
            const maxReplace = replace.length - 1;
            find.forEach((f, i) => {
                let r = replace[i];
                if (typeof r === 'undefined') {
                    r = replace[maxReplace];
                }
                res = res.replace(new RegExp(f, 'g'), r);
            });
            return res;
        }
    }

    /**
     * Генерирует файл из шаблона
     * @param {string} templateContent Содержимое шаблона
     * @param {string} fileName Имя файла для создания
     * @returns {string} Путь к созданному файлу
     * @private
     */
    _generateFile(templateContent, fileName) {
        const find = [
            '{{date}}',
            '{{time}}',
            '{{name}}',
            '{{className}}',
            '__className__',
            '{{}}',
            '{{hostname}}',
            '{{port}}',
        ];
        const name = this.#name.substring(0, 1).toUpperCase() + this.#name.substring(1);
        const date = `${new Date().getDate().toString().padStart(2, '0')}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getFullYear()}`;
        const time = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
        const replace = [
            date,
            time,
            this.#name,
            name,
            name,
            '',
            '"' + (this.params?.hostname || 'localhost') + '"',
            this.params?.port || 3000,
        ];
        fileName = this._replace(find, replace, fileName);
        const content = this._replace(find, replace, templateContent);
        utils.fwrite(fileName, content);
        return fileName;
    }

    /**
     * Создает файл конфигурации проекта
     * @param {string} path Путь к шаблонам
     * @param {string} type Тип проекта
     * @private
     */
    _getConfigFile(path, type) {
        console.log('Создается файл с конфигурацией приложения: ...');
        const configFile = `${this.#path}/config/{{name}}Config.ts`;
        let configContent;
        if (utils.isFile(`${path}/config/defaultConfig.js`)) {
            const config = require(`${path}/config/defaultConfig`);
            configContent = this._initConfig(config.config);
        } else {
            configContent = '';
        }
        this._generateFile(configContent, configFile);
        console.log('Файл с конфигурацией успешно создан!');
    }

    /**
     * Создает файл параметров проекта
     * @param {string} path Путь к шаблонам
     * @param {string} type Тип приложения
     * @private
     */
    _getParamsFile(path, type) {
        console.log('Создается файл с параметрами приложения: ...');
        const paramsFile = `${this.#path}/config/{{name}}Params.ts`;
        let paramsContent;
        if (utils.isFile(`${path}/config/${type}Params.js`)) {
            const param = require(`${path}/config/${type}Params`);
            paramsContent = this._initParams(param.params);
        } else {
            paramsContent = '';
        }
        this._generateFile(paramsContent, paramsFile);
        console.log('Файл с параметрами успешно создан!');
    }

    /**
     * Создает структуру проекта
     * @param {string} type Тип проекта (Default или Quiz)
     * @private
     */
    _create(type = CreateController.T_DEFAULT) {
        if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(type) !== -1) {
            const standardPath = __dirname + '/../template';
            const configFile = `${this.#path}/config`;
            if (!utils.isDir(configFile)) {
                fs.mkdirSync(configFile);
            }
            const typeToLower = type.toLowerCase();

            this._getConfigFile(standardPath, typeToLower);
            this._getParamsFile(standardPath, typeToLower);

            let controllerFile = `${this.#path}/controller`;
            if (!utils.isDir(controllerFile)) {
                fs.mkdirSync(controllerFile);
            }

            console.log('Создается класс с логикой приложения: ...');
            controllerFile += '/{{className}}Controller.ts';
            const controllerContent = this._getFileContent(
                `${standardPath}/controller/${type}Controller.ts.text`,
            );
            this._generateFile(controllerContent, controllerFile);
            console.log('Класс с логикой приложения успешно создан!');

            console.log('Создается index файл: ...');
            let path = 'index';
            const mode = this.params?.mode;
            if (mode === 'dev') {
                path += 'Dev';
            } else if (mode === 'dev-online') {
                path += 'DevOnline';
            } else if (mode === 'build') {
                path += 'Build';
            }
            const indexFile = `${this.#path}/index.ts`;
            const indexContent = this._getFileContent(`${standardPath}/${path}.ts.text`);
            this._generateFile(indexContent, indexFile);
            console.log('Index файл успешно создан!');

            console.log(`Проект успешно создан, и находится в директории: ${this.#path}`);
        } else {
            console.warn('Не удалось создать проект!');
        }
    }

    /**
     * Генерирует файл
     * @param fileName
     * @param content
     */
    generateFile(fileName, content) {
        utils.fwrite(`${this.#path}/${fileName}`, content);
        console.log('.env файл успешно создан!');
    }

    /**
     * Форматирует проект через prettier
     */
    format() {
        exec(`prettier.cmd --write ${this.#path}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
        });
    }

    /**
     * Инициализация параметров проекта
     * @param name Имя проекта
     * @param type Тип проекта
     * @public
     */
    init(name = null, type = CreateController.T_DEFAULT) {
        const correctName = name?.replace(/\W/g, '_');
        if (correctName) {
            this.#name = correctName;
            this.#path = '';
            if (this.params && this.params.path) {
                this.#path = this.params.path;
                const paths = this.#path.split('/');
                let path = '';
                paths.forEach((dir) => {
                    path += `${dir}/`;
                    if (dir !== './' && path !== '../') {
                        if (!utils.isDir(path)) {
                            fs.mkdirSync(path);
                        }
                    }
                });
            } else {
                this.#path += correctName;
                if (!utils.isDir(this.#path)) {
                    fs.mkdirSync(this.#path);
                }
            }
            this._create(type);
        } else {
            console.error('Не указано имя приложения!');
        }
    }
}

/**
 * Контроллер для создания новых проектов и компонентов.
 */
exports.create = CreateController;
