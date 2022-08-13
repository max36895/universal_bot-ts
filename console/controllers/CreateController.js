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

    _path;
    _name;
    /**
     * Параметры для создания приложения
     */
    params;

    _getFileContent = function (file) {
        let content = '';
        if (file && utils.isFile(file)) {
            content = utils.fread(file);
        }
        return content;
    };

    _getHeaderContent = function () {
        let headerContent = "/*\n";
        headerContent += "/* Created by u_bot\n";
        headerContent += " * Date: {{date}}\n";
        headerContent += " * Time: {{time}}\n";
        headerContent += " */\n\n";
        return headerContent;
    };

    _initParams = function (defaultParams) {
        let params;
        if (this.params && this.params.params) {
            params = {...defaultParams, ...this.params.params}
        } else {
            params = defaultParams;
        }

        let content = this._getHeaderContent();
        content += 'import {IAppParam} from "ubot";\n\n';
        content += "export default function(): IAppParam {\n";
        content += '\treturn ';
        content += JSON.stringify(params, null, '\t');
        content += ";\n";
        content += "}\n";

        return content;
    };

    _initConfig = function (defaultConfig) {
        let config;
        if (this.params && this.params.config) {
            config = {...defaultConfig, ...this.params.config};
        } else {
            config = defaultConfig;
        }
        let content = this._getHeaderContent();
        content += 'import {IAppConfig} from "ubot";\n\n';
        content += "export default function (): IAppConfig {\n";
        content += '\treturn ';
        content += JSON.stringify(config, null, '\t');
        content += ";\n";
        content += "}\n";

        return content;
    };

    _replace = function (find, replace, str) {
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

    _generateFile = function (templateContent, fileName) {
        const find = [
            '{{date}}',
            '{{time}}',
            '{{name}}',
            '{{className}}',
            '__className__',
            '{{}}',
        ];
        const name = this._name.substr(0, 1).toUpperCase() + this._name.substr(1);
        const date = `${(new Date()).getDay()}.${(new Date()).getMonth()}.${(new Date()).getFullYear()}`;
        const time = `${(new Date()).getHours()}:${(new Date()).getMinutes()}`;
        const replace = [
            date,
            time,
            this._name,
            name
        ];
        fileName = this._replace(find, replace, fileName);
        const content = this._replace(find, replace, templateContent);
        utils.fwrite(fileName, content);
        return fileName;
    };

    _getConfigFile = function (path, type) {
        console.log('Создается файл с конфигурацией приложения: ...');
        const configFile = `${this._path}/config/{{name}}Config.ts`;
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

    _getParamsFile = function (path) {
        console.log('Создается файл с параметрами приложения: ...');
        const paramsFile = `${this._path}/config/{{name}}Params.ts`;
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

    _create = function (type = CreateController.T_DEFAULT) {
        if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(type) !== -1) {
            const standardPath = __dirname + '/../template';
            const configFile = `${this._path}/config`;
            if (!utils.is_dir(configFile)) {
                fs.mkdirSync(configFile);
            }
            const typeToLower = type.toLowerCase();

            this._getConfigFile(standardPath, typeToLower);
            this._getParamsFile(standardPath);

            let controllerFile = `${this._path}/controller`;
            if (!utils.is_dir(controllerFile)) {
                fs.mkdirSync(controllerFile);
            }

            console.log('Создается класс с логикой приложения: ...');
            controllerFile += '/{{className}}Controller.ts';
            const controllerContent = this._getFileContent(`${standardPath}/controller/${type}Controller.ts`);
            this._generateFile(controllerContent, controllerFile);
            console.log('Класс с логикой приложения успешно создан!');

            console.log('Создается index файл: ...');
            const indexFile = `${this._path}/index.ts`;
            const indexContent = this._getFileContent(`${standardPath}/index.ts`);
            this._generateFile(indexContent, indexFile);
            console.log('Index файл успешно создан!');

            console.log(`Проект успешно создан, и находится в директории: ${this._path}`);
        } else {
            console.log('Не удалось создать проект!');
        }
    };

    /**
     * Инициализация параметров проекта
     * @param name Имя проекта
     * @param type Тип проекта
     * @public
     */
    init = function (name = null, type = CreateController.T_DEFAULT) {
        if (name) {
            if (!utils.is_dir(name)) {
                fs.mkdirSync(name);
            }
            this._name = name;
            this._path = '';
            if (this.params && this.params.path) {
                this._path = this.params.path;
                const paths = this._path.split('/');
                let path = '';
                paths.forEach((p) => {
                    path += `${p}/`;
                    if (p !== './' && p !== '../') {
                        if (!utils.is_dir(path)) {
                            fs.mkdirSync(path);
                        }
                    }
                });
            }
            this._path += name;
            this._create(type);
        }
    };
}

/**
 * @method init
 */

exports.create = CreateController;
