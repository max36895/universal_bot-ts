"use strict";
const fs = require('fs');
const utils = require('../utils').utils;

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

    _getFileContent(file) {
        let content = '';
        if (file && utils.isFile(file)) {
            content = utils.fread(file);
        }
        return content;
    };

    _getHeaderContent() {
        let headerContent = "/*\n";
        headerContent += "/* Created by umbot\n";
        headerContent += " * Date: {{date}}\n";
        headerContent += " * Time: {{time}}\n";
        headerContent += " */\n\n";
        return headerContent;
    };

    _initParams(defaultParams) {
        let params;
        if (this.params && this.params.params) {
            params = {...defaultParams, ...this.params.params}
        } else {
            params = defaultParams;
        }

        let content = this._getHeaderContent();
        content += 'import {IAppParam} from \'umbot/mmApp\';\n\n';
        content += "export default function(): IAppParam {\n";
        content += '\treturn ';
        content += JSON.stringify(params, null, '\t');
        content += ";\n";
        content += "}\n";

        return content;
    };

    _initConfig(defaultConfig) {
        let config;
        if (this.params && this.params.config) {
            config = {...defaultConfig, ...this.params.config};
        } else {
            config = defaultConfig;
        }
        let content = this._getHeaderContent();
        content += 'import {IAppConfig} from \'umbot/mmApp\';\n\n';
        content += "export default function (): IAppConfig {\n";
        content += '\treturn ';
        content += JSON.stringify(config, null, '\t');
        content += ";\n";
        content += "}\n";

        return content;
    };

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
    };

    _generateFile(templateContent, fileName) {
        const find = [
            '{{date}}',
            '{{time}}',
            '{{name}}',
            '{{className}}',
            '__className__',
            '{{}}',
            '{{hostname}}',
            '{{port}}'
        ];
        const name = this.#name.substr(0, 1).toUpperCase() + this.#name.substr(1);
        const date = `${(new Date()).getDay()}.${(new Date()).getMonth()}.${(new Date()).getFullYear()}`;
        const time = `${(new Date()).getHours()}:${(new Date()).getMinutes()}`;
        const replace = [
            date,
            time,
            this.#name,
            name,
            name,
            '',
            '"' + (this.params.hostname || 'localhost') + '"',
            this.params.port || 3000
        ];
        fileName = this._replace(find, replace, fileName);
        const content = this._replace(find, replace, templateContent);
        utils.fwrite(fileName, content);
        return fileName;
    };

    _getConfigFile(path, type) {
        console.log('Создается файл с конфигурацией приложения: ...');
        const configFile = `${this.#path}/config/{{name}}Config.ts`;
        let configContent;
        if (utils.isFile(`${path}/config/${type}Config.js`)) {
            const config = require(`${path}/config/${type}Config`);
            configContent = this._initConfig(config.config);
        } else {
            configContent = '';
        }
        this._generateFile(configContent, configFile);
        console.log('Файл с конфигурацией успешно создан!');
    };

    _getParamsFile(path) {
        console.log('Создается файл с параметрами приложения: ...');
        const paramsFile = `${this.#path}/config/{{name}}Params.ts`;
        let paramsContent;
        if (utils.isFile(`${path}/config/defaultParams.js`)) {
            const param = require(`${path}/config/defaultParams`);
            paramsContent = this._initParams(param.params);
        } else {
            paramsContent = '';
        }
        this._generateFile(paramsContent, paramsFile);
        console.log('Файл с параметрами успешно создан!');
    };

    _create(type = CreateController.T_DEFAULT) {
        if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(type) !== -1) {
            const standardPath = __dirname + '/../template';
            const configFile = `${this.#path}/config`;
            if (!utils.is_dir(configFile)) {
                fs.mkdirSync(configFile);
            }
            const typeToLower = type.toLowerCase();

            this._getConfigFile(standardPath, typeToLower);
            this._getParamsFile(standardPath);

            let controllerFile = `${this.#path}/controller`;
            if (!utils.is_dir(controllerFile)) {
                fs.mkdirSync(controllerFile);
            }

            console.log('Создается класс с логикой приложения: ...');
            controllerFile += '/{{className}}Controller.ts';
            const controllerContent = this._getFileContent(`${standardPath}/controller/${type}Controller.ts`);
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
            const indexContent = this._getFileContent(`${standardPath}/${path}.ts`);
            this._generateFile(indexContent, indexFile);
            console.log('Index файл успешно создан!');

            console.log(`Проект успешно создан, и находится в директории: ${this.#path}`);
        } else {
            console.warn('Не удалось создать проект!');
        }
    };

    /**
     * Инициализация параметров проекта
     * @param name Имя проекта
     * @param type Тип проекта
     * @public
     */
    init(name = null, type = CreateController.T_DEFAULT) {
        if (name) {
            this.#name = name;
            this.#path = '';
            if (this.params && this.params.path) {
                this.#path = this.params.path;
                const paths = this.#path.split('/');
                let path = '';
                paths.forEach((dir) => {
                    path += `${dir}/`;
                    if (dir !== './' && path !== '../') {
                        if (!utils.is_dir(path)) {
                            fs.mkdirSync(path);
                        }
                    }
                });
            } else {
                this.#path += name;
                if (!utils.is_dir(this.#path)) {
                    fs.mkdirSync(this.#path);
                }
            }
            this._create(type);
        } else {
            console.error('Не указано имя приложения!')
        }
    };
}

/**
 * @method init
 */
exports.create = CreateController;
