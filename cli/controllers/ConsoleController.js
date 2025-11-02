'use strict';
const CreateController = require(__dirname + '/CreateController').create;
const utils = require(__dirname + '/../utils').utils;

const VERSION = '2.1.4';

function getFlags(argv) {
    const flags = [];
    argv.forEach((arg) => {
        if (arg.startsWith('--')) {
            flags.push(arg);
        }
    });
    return flags;
}

function generateEnv() {
    utils.fwrite(
        '.env',
        `TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VK_CONFIRMATION_TOKEN=your-vk-confirmation-token
VIBER_TOKEN=your-viber-token
YANDEX_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token
MAX_TOKEN=your-max-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db`,
    );
    console.log('.env файл успешно создан');
}

/**
 * Консольный скрипт, позволяющий создать пустой проект.
 * @param param
 */
function main(
    param = { appName: null, command: null, mode: 'prod', hostname: 'localhost', port: 3000 },
    argv,
) {
    const infoText =
        'Доступные параметры:\n' +
        '\n - create <project-name> [--minimal] [--prod] - Создать новый навык/бот. В качестве параметра передается название проекта(На Английском языке) или json файл с параметрами.' +
        '\n\t --minimal   Создать минимальную рабочую версию (1 файл). Работает только для стандартного шаблона.' +
        '\n\t --prod      Создать production-готовый проект (Docker, CI/CD)' +
        '\n - generateEnv - Сгенерировать файл .env' +
        '\n - add <feature> - Добавляет данные в проект. Доступные типы: ' +
        '\n\t docker  Добавляет docker-compose.yml' +
        '\n\t deploy  Добавляет файл для деплоя на сервер' +
        '\n\t env     Добавляет файл .env';
    if (param && param.command) {
        const create = new CreateController();
        switch (param.command) {
            case 'create':
                create.flags = getFlags(argv);
                create.params = param.params ?? param;
                let type = CreateController.T_DEFAULT;
                if (param.params && param.params.type) {
                    let paramType = param.params.type.toLowerCase();
                    paramType = paramType.substring(0, 1).toUpperCase() + paramType.substring(1);
                    if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(paramType)) {
                        type = paramType;
                    } else {
                        throw new Exception('Указан не поддерживаемый тип для создания шаблона!');
                    }
                }
                let envContent = '';
                if (param.params?.isEnv) {
                    envContent = `TELEGRAM_TOKEN=${create.params?.params?.telegram_token}
VK_TOKEN=${create.params?.params?.vk_token}
VK_CONFIRMATION_TOKEN=${create.params?.params?.vk_confirmation_token}
VIBER_TOKEN=${create.params?.params?.viber_token}
YANDEX_TOKEN=${create.params?.params?.yandex_token}
MARUSIA_TOKEN=${create.params?.params?.marusia_token}
MAX_TOKEN=${create.params?.params?.max_token}

DB_HOST=${create.params?.config?.db?.host}
DB_USER=${create.params?.config?.db?.user}
DB_PASSWORD=${create.params?.config?.db?.pass}
DB_NAME=${create.params?.config?.db?.database}`;

                    delete create.params?.config?.db;
                    delete create.params?.params?.telegram_token;
                    delete create.params?.params?.vk_token;
                    delete create.params?.params?.vk_confirmation_token;
                    delete create.params?.params?.viber_token;
                    delete create.params?.params?.yandex_token;
                    delete create.params?.params?.marusia_token;
                    delete create.params?.params?.max_token;
                }
                create.init(param.appName, type);
                if (envContent) {
                    create.generateFile('.env', envContent);
                }
                create.format();

                break;

            case '-v':
            case 'version':
                console.log(`version: ${VERSION}\n`);
                break;

            case 'generateenv':
                generateEnv();
                break;

            case 'add':
                switch (argv[3]) {
                    case 'docker':
                        create.createDockerFile(__dirname);
                        break;
                    case 'deploy':
                        create.createDeployFile(__dirname);
                        break;
                    case 'env':
                        generateEnv();
                        break;
                    default:
                        console.log(infoText);
                }
                break;

            default:
                console.log(infoText);
                break;
        }
    } else {
        console.log(infoText);
    }
}

exports.main = main;
