'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const utils = require(path.join(__dirname, '..', 'utils.js')).utils;

/**
 * Класс, создающий пустой проект, или шаблон для готового проекта.
 */
class CreateController {
    /**
     * Создает пустой проект
     */
    static T_DEFAULT = 'Default';
    /**
     * Создает викторину
     */
    static T_QUIZ = 'Quiz';

    flags = [];

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
        let headerContent = '/**\n';
        headerContent += ' * Created by umbot\n';
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
        if (this.params && this.params.config) {
            config = { ...defaultConfig, ...this.params.config };
        } else {
            config = defaultConfig;
        }
        if (this.params && this.params.isEnv) {
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
            return str.split(find).join(replace);
        } else {
            let res = str;
            const maxReplace = replace.length - 1;
            find.forEach((f, i) => {
                let r = replace[i];
                if (r === undefined) {
                    r = replace[maxReplace];
                }
                res = res.split(f).join(r);
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
            '{{imageName}}',
            '{{}}',
            '{{hostname}}',
            '{{port}}',
        ];
        const rawName = this.#name || 'project';
        const name = rawName.substring(0, 1).toUpperCase() + rawName.substring(1);
        // Имя Docker-образа обязано быть в нижнем регистре
        const imageName = rawName.toLowerCase();
        const now = new Date();
        const date = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        // Параметры могут быть прочитаны из пользовательского JSON. JSON.stringify сохраняет
        // строковый литерал валидным даже при кавычках и переводах строки.
        const hostname = JSON.stringify(String(this.params?.hostname || '0.0.0.0'));
        const requestedPort = Number(this.params?.port);
        const port =
            Number.isInteger(requestedPort) && requestedPort >= 0 && requestedPort <= 65535
                ? requestedPort
                : 3000;
        const replace = [date, time, rawName, name, name, imageName, '', hostname, port];
        fileName = this._replace(find, replace, fileName);
        const content = this._replace(find, replace, templateContent);
        utils.fwrite(fileName, content);
        return fileName;
    }

    /**
     * Создает файл конфигурации проекта
     * @param {string} path Путь к шаблонам
     * @private
     */
    _getConfigFile(dirPath) {
        console.log('Создается файл с конфигурацией приложения: ...');
        const configFile = `${this.#path}/src/config/{{name}}Config.ts`;
        let configContent;
        if (utils.isFile(`${dirPath}/config/defaultConfig.js`)) {
            const config = require(`${dirPath}/config/defaultConfig`);
            configContent = this._initConfig(config.config);
        } else {
            configContent = '';
        }
        this._generateFile(configContent, configFile);
        console.log('Файл с конфигурацией успешно создан');
    }

    /**
     * Создает файл параметров проекта
     * @param {string} dirPath Путь к шаблонам
     * @param {string} type Тип приложения
     * @private
     */
    _getParamsFile(dirPath, type) {
        console.log('Создается файл с параметрами приложения: ...');
        const paramsFile = `${this.#path}/src/config/{{name}}Params.ts`;
        let paramsContent;
        if (utils.isFile(`${dirPath}/config/${type}Params.js`)) {
            const param = require(`${dirPath}/config/${type}Params`);
            paramsContent = this._initParams(param.params);
        } else {
            paramsContent = '';
        }
        this._generateFile(paramsContent, paramsFile);
        console.log('Файл с параметрами успешно создан');
    }

    createDockerFile(dirPath) {
        const standardPath = path.join(__dirname, '..', 'template');
        const dockerFile = `${dirPath}/Dockerfile`;
        this.#assertFileCanBeWritten(dockerFile);
        const dockerContent = this._getFileContent(`${standardPath}/docker/DockerFile.text`);
        this._generateFile(dockerContent, dockerFile);
        console.log('Dockerfile успешно создан');

        // .dockerignore не даёт секретам (.env), логам и node_modules попасть
        // в слои образа при COPY . . на этапе сборки.
        const dockerIgnoreFile = `${dirPath}/.dockerignore`;
        this.#assertFileCanBeWritten(dockerIgnoreFile);
        const dockerIgnoreContent = this._getFileContent(
            `${standardPath}/docker/.dockerignore.text`,
        );
        this._generateFile(dockerIgnoreContent, dockerIgnoreFile);
        console.log('.dockerignore успешно создан');
    }

    createDeployFile(dirPath) {
        const standardPath = path.join(__dirname, '..', 'template');
        const deployFile = `${dirPath}/.github/workflows/deploy.yml`;
        this.#assertFileCanBeWritten(deployFile);
        fs.mkdirSync(`${dirPath}/.github`, { recursive: true });
        fs.mkdirSync(`${dirPath}/.github/workflows`, { recursive: true });
        const deployContent = this._getFileContent(`${standardPath}/github/deploy.yml`);
        this._generateFile(deployContent, deployFile);
        console.log('deploy.yml успешно создан');
    }

    /**
     * Создает структуру проекта
     * @param {string} type Тип проекта (Default или Quiz)
     * @private
     */
    _create(type = CreateController.T_DEFAULT) {
        if (![CreateController.T_DEFAULT, CreateController.T_QUIZ].includes(type)) {
            console.warn(
                'Не удалось создать проект, так как не удалось определить тип создаваемого приложения',
            );
        } else {
            const standardPath = path.join(__dirname, '..', 'template');
            const srcPath = `${this.#path}/src`;
            if (!utils.isDir(srcPath)) {
                fs.mkdirSync(srcPath);
            }
            const configFile = `${srcPath}/config`;
            if (!utils.isDir(configFile)) {
                fs.mkdirSync(configFile);
            }
            const typeToLower = type.toLowerCase();

            this._getConfigFile(standardPath);
            this._getParamsFile(standardPath, typeToLower);

            if (!(this.flags.includes('--minimal') && type === CreateController.T_DEFAULT)) {
                let controllerFile = `${srcPath}/controller`;
                if (!utils.isDir(controllerFile)) {
                    fs.mkdirSync(controllerFile);
                }
                console.log('Создается класс с логикой приложения: ...');
                controllerFile += '/{{className}}Controller.ts';
                const controllerContent = this._getFileContent(
                    `${standardPath}/controller/${type}Controller.ts.text`,
                );
                this._generateFile(controllerContent, controllerFile);
                console.log('Класс с логикой приложения успешно создан');
            }

            console.log('Создается index файл: ...');
            let indexTemplate = 'index';
            const mode = this.params?.mode;
            if (mode === 'dev') {
                indexTemplate += 'Dev';
            } else if (mode === 'dev-online') {
                indexTemplate += 'DevOnline';
            } else if (mode === 'build') {
                indexTemplate += 'Build';
            }
            if (this.flags.includes('--minimal') && type === CreateController.T_DEFAULT) {
                indexTemplate += 'Min';
            }
            const indexFile = `${srcPath}/index.ts`;
            const indexContent = this._getFileContent(`${standardPath}/${indexTemplate}.ts.text`);
            this._generateFile(indexContent, indexFile);
            console.log('index.ts успешно создан');

            const packageFile = `${this.#path}/package.json`;
            const packageContent = this._getFileContent(`${standardPath}/package.json.text`);
            this._generateFile(packageContent, packageFile);
            console.log('package.json успешно создан');

            const tsconfigFile = `${this.#path}/tsconfig.json`;
            const tsconfigContent = this._getFileContent(`${standardPath}/tsconfig.json`);
            this._generateFile(tsconfigContent, tsconfigFile);
            console.log('tsconfig.json успешно создан');

            const gitignoreFile = `${this.#path}/.gitignore`;
            const gitignoreContent = this._getFileContent(`${standardPath}/.gitignore`);
            this._generateFile(gitignoreContent, gitignoreFile);
            console.log('.gitignore успешно создан');

            if (this.flags.includes('--prod')) {
                this.createDeployFile(this.#path);
                this.createDockerFile(this.#path);
            }

            console.log(`Проект успешно создан, и находится в директории: ${this.#path}`);
        }
    }

    /**
     * Генерирует файл
     * @param fileName
     * @param content
     */
    generateFile(fileName, content) {
        utils.fwrite(`${this.#path}/${fileName}`, content);
        console.log('.env файл успешно создан');
    }

    /**
     * Форматирует проект через prettier
     */
    format() {
        try {
            const prettier = process.platform === 'win32' ? 'prettier.cmd' : 'prettier';
            // timeout защищает CLI от зависания, если prettier впадёт в deadlock/бесконечный цикл
            execFileSync(prettier, ['--write', this.#path], {
                stdio: 'ignore',
                timeout: 30000,
            });
        } catch {
            console.warn('Предупреждение: не удалось отформатировать код');
        }
    }

    /**
     * Проверяет, можно ли создавать проект в указанной директории.
     * Если директория существует и не пуста, генерация требует явный флаг --force.
     * @param {string} dirPath — путь к целевой директории
     * @returns {Promise<void>}
     * @private
     */
    _checkOutputDir(dirPath) {
        if (utils.isDir(dirPath) && !this.flags.includes('--force')) {
            const entries = fs.readdirSync(dirPath);
            if (entries.length > 0) {
                throw new Error(
                    `Директория для генерации не пустая: ${dirPath}. Укажите --force, чтобы перезаписать файлы.`,
                );
            }
        }
    }

    /**
     * Не даёт служебным командам случайно заменить пользовательский файл.
     * @param {string} filePath — путь к создаваемому файлу
     * @private
     */
    #assertFileCanBeWritten(filePath) {
        if (utils.isFile(filePath) && !this.flags.includes('--force')) {
            throw new Error(
                `Файл уже существует: ${filePath}. Укажите --force, чтобы перезаписать его.`,
            );
        }
    }

    /**
     * Инициализация параметров проекта
     * @param name Имя проекта
     * @param type Тип проекта
     * @public
     */
    async init(name = null, type = CreateController.T_DEFAULT) {
        const correctName = name?.replace(/\W/g, '_');
        if (correctName) {
            this.#name = correctName;
            if (this.params && this.params.path) {
                this.#path = path.resolve(this.params.path);
            } else {
                this.#path = path.resolve(correctName);
            }
            this._checkOutputDir(this.#path);
            if (!utils.isDir(this.#path)) {
                fs.mkdirSync(this.#path, { recursive: true });
            }
            this._create(type);
        } else {
            console.error('Не указано имя проекта');
        }
    }
}

/**
 * Контроллер для создания новых проектов и компонентов.
 */
exports.create = CreateController;
