'use strict';
const CreateController = require(__dirname + '/CreateController').create;
const utils = require(__dirname + '/../utils').utils;

const VERSION = '2.0.0';

/**
 * Консольный скрипт, позволяющий создать пустой проект.
 * @param param
 */
function main(
    param = { appName: null, command: null, mode: 'prod', hostname: 'localhost', port: 3000 },
) {
    const infoText =
        'Доступные параметры:\n' +
        '\ncreate (project name) - Создать новый навык/бот. В качестве параметра передается название проекта(На Английском языке) или json файл с параметрами.' +
        '\ngenerateEnv - Сгенерировать файл .env';
    if (param && param.command) {
        switch (param.command) {
            case 'create':
                const create = new CreateController();
                create.params = param.params;
                let type = CreateController.T_DEFAULT;
                if (param.params && param.params.type) {
                    let paramType = param.params.type.toLowerCase();
                    paramType = paramType.substr(0, 1).toUpperCase() + paramType.substr(1);
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
                utils.fwrite(
                    '.env',
                    `TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VK_CONFIRMATION_TOKEN=your-vk-confirmation-token
VIBER_TOKEN=your-viber-token
YANDEX_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db`,
                );
                console.log('.env файл успешно создан');
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
