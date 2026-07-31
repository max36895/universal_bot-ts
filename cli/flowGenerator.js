'use strict';
/**
 * Генератор проекта umbot из flow.json.
 * АРХИТЕКТУРА: addCommand + addStep, блоки = переиспользуемые функции.
 * @module flowGenerator
 */

const fs = require('fs');
const path = require('path');
const utils = require(__dirname + '/utils.js').utils;

/**
 * Экранирует строку для безопасной вставки в TypeScript/JavaScript код.
 * Обрабатывает: обратные слеши, кавычки, бэктики, $, переносы строк, \r.
 * @param {string} s — исходная строка
 * @returns {string} экранированная строка
 */
function escapeStr(s) {
    return String(s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}

/**
 * Проверяет, является ли строка валидным JS-идентификатором.
 * @param {string} name — проверяемое имя
 * @returns {boolean} true если имя соответствует /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
 */
function isValidJSIdentifier(name) {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Генерирует выражение доступа к userData для переменной.
 * Для валидных JS-идентификаторов: ctrl.userData.name
 * Для нестандартных имён: ctrl.userData['name']
 * @param {string} name — имя переменной
 * @returns {string} JS-выражение доступа к userData
 */
function userDataAccess(name) {
    if (!name) return 'ctrl.userData';
    if (isValidJSIdentifier(name)) {
        return `ctrl.userData.${name}`;
    }
    return `ctrl.userData['${escapeStr(name)}']`;
}

/**
 * Маппинг системных переменных на JavaScript выражения.
 * Системные переменные начинаются с __ и заменяются на нативный JS-код.
 */
const SYSTEM_VARS = {
    __currentTime: "new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })",
    __currentDate: "new Date().toLocaleDateString('ru-RU')",
    __currentTimestamp: 'Date.now()',
    __randomNumber: 'Math.floor(Math.random() * 101)',
    __userName: "'Пользователь'",
};

/**
 * Проверяет, является ли переменная системной (начинается на __).
 * @param {string} name — имя переменной
 * @returns {boolean} true если имя является системной переменной
 */
function isSystemVar(name) {
    return name && name.startsWith('__') && SYSTEM_VARS[name];
}

/**
 * Получает JavaScript выражение для системной переменной.
 * @param {string} name — имя системной переменной
 * @returns {string} JS-выражение (например, "new Date().toLocaleTimeString(...)")
 */
function getSystemVarExpr(name) {
    return SYSTEM_VARS[name] || name;
}

/**
 * Конвертирует текст с {{variable}} в JS template literal.
 * Порядок экранирования: \ → \\, ` → \`, ${ → \${{.
 * Затем заменяет {{var}} → ${ctrl.userData.var} или системное выражение.
 * @param {string} text — текст с возможными {{variable}}
 * @returns {string} JS-выражение (одинарные кавычки или template literal)
 */
function textExpr(text) {
    if (!text) return "''";
    if (text.includes('{{')) {
        // Порядок экранирования: \ → \\, потом ` → \`, потом ${ → \${
        // После этого заменяем {{var}} → ${...} — эти ${ НЕ экранируются
        let escaped = text.replace(/\\/g, '\\\\');
        escaped = escaped.replace(/`/g, '\\`');
        escaped = escaped.replace(/\$\{/g, '\\${');
        // Убираем лишние скобки: {{{{var}}}} → {{var}}
        escaped = escaped.replace(/\{{4,}(\w+)\}{4,}/g, '{{$1}}');
        // Заменяем {{var}} на ${...}
        const converted = escaped.replace(/\{\{(\w+)\}\}/g, (_, name) => {
            if (isSystemVar(name)) {
                return `\${${getSystemVarExpr(name)}}`;
            }
            return `\${${userDataAccess(name)}}`;
        });
        return '`' + converted + '`';
    }
    return `'${escapeStr(text)}'`;
}

/**
 * Собирает имена всех переменных из документа (saveTo, action.field, action.saveResponseTo).
 * Системные переменные (__) исключаются.
 * @param {Object} doc — FlowDocument
 * @returns {string[]} массив уникальных имён переменных
 */
function collectVarNames(doc) {
    const vars = new Set();
    for (const n of doc.nodes) {
        if (n.saveTo && !isSystemVar(n.saveTo)) vars.add(n.saveTo);
        if (n.actions)
            n.actions.forEach((a) => {
                if (a.field && !isSystemVar(a.field)) vars.add(a.field);
            });
    }
    return [...vars];
}

/**
 * Заменяет имена переменных на ctrl.userData.* в выражении.
 * Сортирует по длине (длинные имена первые) для корректной замены.
 * Экранирует спецсимволы regex в именах переменных.
 * @param {string} expr — выражение с именами переменных
 * @param {string[]} varNames — имена переменных для замены
 * @returns {string} выражение с ctrl.userData.* вместо имён переменных
 */
function resolveVars(expr, varNames) {
    let result = expr;

    // Сортируем один раз по убыванию длины, чтобы не заменять "name" внутри "userName"
    const sorted = [...varNames].sort((a, b) => b.length - a.length);
    for (const name of sorted) {
        if (isSystemVar(name)) continue;
        const access = userDataAccess(name);
        // Экранируем спецсимволы regex в имени переменной
        const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`\\b${safeName}\\b`, 'g'), access);
    }

    // Обрабатываем системные переменные после переменных пользователя
    // Сортируем по убыванию длины ключа, чтобы __currentTimestamp заменялся раньше __currentTime
    const sortedSysVars = Object.entries(SYSTEM_VARS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, jsExpr] of sortedSysVars) {
        if (result.includes(name)) {
            const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(`\\b${safeName}\\b`, 'g'), `(${jsExpr})`);
        }
    }

    return result;
}

/**
 * Генерирует код для блока действия (random_number, set_variable, http_request).
 * @param {Object} block — блок действия из FlowDocument
 * @param {string[]} varNames — имена переменных для resolveVars
 * @param {string} indent — отступ (по умолчанию 4 пробела)
 * @returns {string[]} массив строк кода
 */
function generateActionFunc(block, varNames, indent) {
    const lines = [];
    switch (block.type) {
        case 'random_number':
            // Пропускаем если имя переменной пустое или содержит только пробелы
            if (block.field && block.field.trim()) {
                lines.push(
                    `${indent}${userDataAccess(block.field)} = rand(${block.min ?? 1}, ${block.max ?? 10});`,
                );
            }
            break;
        case 'set_variable':
            // Пропускаем если имя переменной пустое или значение пустое
            if (block.field && block.field.trim() && block.value && block.value.trim()) {
                let expr;
                // Если значение содержит {{var}} — генерируем template literal
                if (block.value.includes('{{')) {
                    expr = textExpr(block.value);
                } else {
                    expr = resolveVars(block.value, varNames);
                    // Если выражение содержит ctrl.userData или ${ — это уже код (переменная/шаблон)
                    // Если это число — тоже код
                    // Иначе оборачиваем в кавычки как строковый литерал
                    const isCode =
                        expr.includes('ctrl.userData') ||
                        expr.includes('${') ||
                        !isNaN(Number(expr)) ||
                        expr.startsWith('(') ||
                        expr.startsWith('Math.') ||
                        expr.startsWith('new ') ||
                        expr.startsWith('Date.');
                    if (!isCode) {
                        expr = `'${escapeStr(expr)}'`;
                    }
                }
                // @ts-ignore — выражения с переменными могут нарушить строгие типы TS
                if (expr.includes('ctrl.userData')) {
                    lines.push(`${indent}// @ts-ignore`);
                }
                lines.push(`${indent}${userDataAccess(block.field)} = ${expr};`);
            }
            break;
        case 'http_request':
            if (block.url) {
                const method = block.method || 'GET';
                let safeHeaders = null;
                if (block.headers && block.headers !== '{}') {
                    try {
                        safeHeaders = JSON.stringify(JSON.parse(block.headers));
                    } catch {
                        safeHeaders = '{}';
                    }
                }
                // Обрабатываем body как строку или объект
                let body = block.body;
                if (body && typeof body === 'object') {
                    body = JSON.stringify(body);
                }
                body = body && body !== '{}' ? body : null;

                lines.push(`${indent}try {`);
                if (method !== 'GET' && body) {
                    const hasVars = /\{\{/.test(String(body));
                    if (hasVars) {
                        // Экранируем backticks и ${ перед заменой {{var}}
                        let templateBody = String(body)
                            .replace(/\\/g, '\\\\')
                            .replace(/`/g, '\\`')
                            .replace(/\$\{/g, '\\${');
                        templateBody = templateBody.replace(/\{\{(\w+)\}\}/g, (_, name) => {
                            if (isSystemVar(name)) return '${' + getSystemVarExpr(name) + '}';
                            return '${' + userDataAccess(name) + '}';
                        });
                        const fetchOpts = [`method: '${method}'`];
                        if (safeHeaders) {
                            fetchOpts.push(`headers: ${safeHeaders}`);
                        } else {
                            fetchOpts.push(`headers: { 'Content-Type': 'application/json' }`);
                        }
                        fetchOpts.push(`body: JSON.parse(\`${templateBody}\`)`);
                        lines.push(
                            `${indent}    const response = await fetch('${escapeStr(block.url)}', { ${fetchOpts.join(', ')} });`,
                        );
                    } else {
                        let parsedBody;
                        try {
                            parsedBody = JSON.parse(String(body));
                        } catch {
                            parsedBody = body;
                        }
                        const fetchOpts = [`method: '${method}'`];
                        if (safeHeaders) {
                            fetchOpts.push(`headers: ${safeHeaders}`);
                        } else {
                            fetchOpts.push(`headers: { 'Content-Type': 'application/json' }`);
                        }
                        fetchOpts.push(`body: JSON.stringify(${JSON.stringify(parsedBody)})`);
                        lines.push(
                            `${indent}    const response = await fetch('${escapeStr(block.url)}', { ${fetchOpts.join(', ')} });`,
                        );
                    }
                } else {
                    // GET без body
                    const fetchOpts = [];
                    if (safeHeaders) {
                        fetchOpts.push(`headers: ${safeHeaders}`);
                    }
                    const optsStr = fetchOpts.length > 0 ? `, { ${fetchOpts.join(', ')} }` : '';
                    lines.push(
                        `${indent}    const response = await fetch('${escapeStr(block.url)}'${optsStr});`,
                    );
                }
                lines.push(
                    `${indent}    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);`,
                );
                lines.push(`${indent}    const data = await response.json();`);
                if (block.saveResponseTo) {
                    lines.push(`${indent}    ${userDataAccess(block.saveResponseTo)} = data;`);
                }
                lines.push(
                    `${indent}} catch (e) { setText(ctrl, \`Ошибка запроса: \${e.message}\`); }`,
                );
            }
            break;
    }
    return lines;
}

/**
 * Генерирует код условия (if/else) с поддержкой всех операторов.
 * @param {Object} cond — условие из FlowDocument
 * @param {string[]} varNames — имена переменных
 * @param {string} indent — отступ
 * @param {string|null} trueFuncName — имя функции для ветки true (или null для inline)
 * @param {string|null} falseFuncName — имя функции для ветки false (или null)
 * @param {string|null} trueNavigation — thisIntentName для ветки true (step/command)
 * @param {string|null} falseNavigation — thisIntentName для ветки false (step/command)
 * @returns {string[]} массив строк if/else кода
 */
function generateConditionFunc(
    cond,
    varNames,
    indent,
    trueFuncName,
    falseFuncName,
    trueNavigation,
    falseNavigation,
    doc,
    connectedBlocks,
) {
    const lines = [];
    // Очищаем имя переменной от {{ }} если они есть (VariablePicker вставляет {{var}})
    let varName = String(cond.variable ?? '');
    if (varName.startsWith('{{') && varName.endsWith('}}')) {
        varName = varName.slice(2, -2);
    }
    // Пропускаем пустые условия — генерация невалидного кода
    if (!varName) {
        return [];
    }
    const condVar = userDataAccess(varName);
    let condVal;

    // Очищаем значение от {{ }} если они есть (VariablePicker вставляет {{var}})
    let rawValue = String(cond.value ?? '');
    if (rawValue.startsWith('{{') && rawValue.endsWith('}}')) {
        rawValue = rawValue.slice(2, -2);
    }

    // Для contains и isEmpty значение всегда как строка
    if (cond.operator === 'contains' || cond.operator === 'isEmpty') {
        // Если значение — переменная, резолвим как ctrl.userData
        if (rawValue && varNames.includes(rawValue)) {
            condVal = userDataAccess(rawValue);
        } else {
            // Если значение число, не оборачиваем в String() в условии
            const isNum = !isNaN(Number(rawValue)) && rawValue.trim() !== '';
            condVal = isNum ? rawValue : `'${escapeStr(rawValue)}'`;
        }
    } else if (rawValue && varNames.includes(rawValue)) {
        condVal = userDataAccess(rawValue);
    } else if (rawValue.trim() === '') {
        // Пустое значение — сравниваем с пустой строкой
        condVal = "''";
    } else {
        const numVal = Number(rawValue);
        condVal = isNaN(numVal) ? `'${escapeStr(rawValue)}'` : numVal;
    }

    // Генерируем выражение if
    let ifExpr;
    switch (cond.operator) {
        case 'eq':
            ifExpr = `${condVar} === ${condVal}`;
            break;
        case 'neq':
            ifExpr = `${condVar} !== ${condVal}`;
            break;
        case 'gt':
            ifExpr = `Number(${condVar}) > Number(${condVal})`;
            break;
        case 'gte':
            ifExpr = `Number(${condVar}) >= Number(${condVal})`;
            break;
        case 'lt':
            ifExpr = `Number(${condVar}) < Number(${condVal})`;
            break;
        case 'lte':
            ifExpr = `Number(${condVar}) <= Number(${condVal})`;
            break;
        case 'contains':
            // Если condVal число, не оборачиваем в String()
            const isNumVal = !isNaN(Number(condVal)) && String(condVal).trim() !== '';
            ifExpr = isNumVal
                ? `String(${condVar}).includes(${condVal})`
                : `String(${condVar}).includes(String(${condVal}))`;
            break;
        case 'isEmpty':
            ifExpr = `!${condVar}`;
            break;
        case 'isNotEmpty':
            ifExpr = `!!${condVar} && ${condVar} !== ''`;
            break;
        case 'isSayTrue':
            // Если указана переменная — используем её, иначе userCommand
            ifExpr = varName
                ? `Text.isSayTrue(String(${condVar}))`
                : `Text.isSayTrue(ctrl.userCommand || '')`;
            break;
        case 'isSayFalse':
            ifExpr = varName
                ? `Text.isSayFalse(String(${condVar}))`
                : `Text.isSayFalse(ctrl.userCommand || '')`;
            break;
        case 'isUrl':
            ifExpr = varName
                ? `Text.isUrl(String(${condVar}))`
                : `Text.isUrl(ctrl.userCommand || '')`;
            break;
        default:
            ifExpr = `${condVar} === ${condVal}`;
    }
    lines.push(`${indent}if (${ifExpr}) {`);
    // Вставляем вызов true функции, навигацию или responseTrue
    if (trueFuncName) {
        // Проверяем, нужен ли await для целевой функции
        let trueAwait = '';
        if (doc && connectedBlocks) {
            const trueNode = doc.nodes.find((n) => `__${n.name || n.id}` === trueFuncName);
            if (trueNode && blockNeedsAsync(trueNode, doc, connectedBlocks)) {
                trueAwait = 'await ';
            }
        }
        lines.push(`${indent}    ${trueAwait}${trueFuncName}(ctrl);`);
    } else if (trueNavigation) {
        lines.push(`${indent}    ${trueNavigation};`);
    } else if (cond.responseTrue) {
        if (cond.responseTrue.text)
            lines.push(`${indent}    setText(ctrl, ${textExpr(cond.responseTrue.text)});`);
        if (cond.responseTrue.buttons) {
            for (const btn of cond.responseTrue.buttons) {
                lines.push(`${indent}    ctrl.buttons.addBtn('${escapeStr(btn.title)}');`);
            }
        }
    }
    lines.push(`${indent}} else {`);
    // Вставляем вызов false функции, навигацию или responseFalse
    if (falseFuncName) {
        // Проверяем, нужен ли await для целевой функции
        let falseAwait = '';
        if (doc && connectedBlocks) {
            const falseNode = doc.nodes.find((n) => `__${n.name || n.id}` === falseFuncName);
            if (falseNode && blockNeedsAsync(falseNode, doc, connectedBlocks)) {
                falseAwait = 'await ';
            }
        }
        lines.push(`${indent}    ${falseAwait}${falseFuncName}(ctrl);`);
    } else if (falseNavigation) {
        lines.push(`${indent}    ${falseNavigation};`);
    } else if (cond.responseFalse) {
        if (cond.responseFalse.text)
            lines.push(`${indent}    setText(ctrl, ${textExpr(cond.responseFalse.text)});`);
        if (cond.responseFalse.buttons) {
            for (const btn of cond.responseFalse.buttons) {
                lines.push(`${indent}    ctrl.buttons.addBtn('${escapeStr(btn.title)}');`);
            }
        }
    }
    lines.push(`${indent}}`);
    return lines;
}

/**
 * Генерирует код кнопок (addBtn/addLink) с опциональным перемешиванием.
 * @param {Array} buttons — массив кнопок FlowButton
 * @param {string} indent — отступ
 * @param {boolean} shuffle — включить случайный порядок кнопок
 * @returns {string[]} массив строк кода
 */
function generateButtonCode(buttons, indent, shuffle = false) {
    const lines = [];
    const validButtons = (buttons || []).filter((btn) => btn.title && btn.title.trim());

    if (validButtons.length === 0) return lines;

    // Если включен рандомный порядок — генерируем массив и перемешиваем в отдельном scope
    if (shuffle && validButtons.length > 1) {
        lines.push(`${indent}// Случайный порядок кнопок`);
        lines.push(`${indent}{`);
        lines.push(`${indent}    const __buttons = [`);
        for (const btn of validButtons) {
            if (btn.type === 'link') {
                lines.push(
                    `${indent}    { type: 'link', title: '${escapeStr(btn.title)}', url: '${escapeStr(btn.url || '')}' },`,
                );
            } else {
                lines.push(
                    `${indent}    { type: 'action', title: '${escapeStr(btn.title)}', target: '${escapeStr(btn.targetNodeId || '')}' },`,
                );
            }
        }
        lines.push(`${indent}];`);
        lines.push(
            `${indent}for (let i = __buttons.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [__buttons[i], __buttons[j]] = [__buttons[j], __buttons[i]]; }`,
        );
        lines.push(`${indent}for (const __btn of __buttons) {`);
        lines.push(
            `${indent}    if (__btn.type === 'link') ctrl.buttons.addLink(__btn.title, __btn.url);`,
        );
        lines.push(`${indent}    else ctrl.buttons.addBtn(__btn.title);`);
        lines.push(`${indent}}`);
        lines.push(`${indent}}`);
    } else {
        // Обычный порядок
        for (const btn of validButtons) {
            if (btn.type === 'link') {
                lines.push(
                    `${indent}ctrl.buttons.addLink('${escapeStr(btn.title)}', '${escapeStr(btn.url || '')}');`,
                );
            } else {
                lines.push(`${indent}ctrl.buttons.addBtn('${escapeStr(btn.title)}');`);
            }
        }
    }
    return lines;
}

/**
 * Рекурсивно проверяет, нужен ли async для блока (HTTP в нём или в 연결ённых блоках).
 * @param {Object} block — проверяемый блок
 * @param {Object} doc — FlowDocument
 * @param {Array} connectedBlocks — связанные блоки
 * @param {Set} visited — посещённые блоки (защита от циклов)
 * @returns {boolean} true если блок или его цепочка требуют async
 */
function blockNeedsAsync(block, doc, connectedBlocks, visited = new Set()) {
    if (visited.has(block.id)) return false;
    visited.add(block.id);
    if ((block.actions || []).some((a) => a.type === 'http_request')) return true;
    const outgoing = findOutgoingBlocks(doc, block.id, connectedBlocks);
    return outgoing.some((b) => blockNeedsAsync(b, doc, connectedBlocks, visited));
}

/**
 * Находит связанные outgoing блоки (next, branch_true, branch_false) для узла.
 * @param {Object} doc — FlowDocument
 * @param {string} nodeId — ID исходного узла
 * @param {Array} connectedBlocks — массив связанных блоков
 * @returns {Array} массив outgoing блоков
 */
function findOutgoingBlocks(doc, nodeId, connectedBlocks) {
    return connectedBlocks.filter((b) =>
        doc.edges.some(
            (e) =>
                e.from === nodeId &&
                e.to === b.id &&
                (e.type === 'next' || e.type === 'branch_true' || e.type === 'branch_false'),
        ),
    );
}

/**
 * Генерирует вызовы outgoing блоков с учётом async (для HTTP-действий).
 * @param {Array} blocks — массив outgoing блоков
 * @param {string} indent — отступ
 * @returns {string[]} массив строк вызовов __name(ctrl)
 */
function generateOutgoingBlockCalls(blocks, indent, doc, connectedBlocks) {
    const lines = [];
    for (const block of blocks) {
        const needsAsync = blockNeedsAsync(block, doc, connectedBlocks);
        lines.push(`${indent}${needsAsync ? 'await ' : ''}__${block.name || block.id}(ctrl);`);
    }
    return lines;
}

/**
 * Проверяет, есть ли среди outgoing блоков те, которые предоставляют текст.
 * @param {Array} blocks — массив outgoing блоков
 * @returns {boolean} true если хотя бы один блок имеет text или response.text
 */
function hasTextFromBlocks(blocks) {
    return blocks.some((b) => b.text || (b.response && b.response.text));
}

/**
 * Генерирует код карточки/галереи (ctrl.card.addImage).
 * @param {Object} card — объект FlowCard с массивом images
 * @param {string} indent — отступ
 * @returns {string[]} массив строк кода
 */
function generateCardCode(card, indent) {
    const lines = [];
    if (!card || !card.images) return lines;
    for (const img of card.images) {
        const args = [
            `'${escapeStr(img.src || '')}'`,
            `'${escapeStr(img.title || '')}'`,
            `'${escapeStr(img.description || '')}'`,
        ];
        if (img.button) args.push(`'${escapeStr(img.button.title || '')}'`);
        lines.push(`${indent}ctrl.card.addImage(${args.join(', ')});`);
    }
    return lines;
}

/**
 * Генерирует функцию __name(ctrl) для standalone блока (action/condition/response).
 * @param {Object} block — блок из FlowDocument
 * @param {string[]} varNames — имена переменных
 * @param {string} indent — отступ
 * @param {Object} doc — полный FlowDocument
 * @param {Array} connectedBlocks — связанные блоки
 * @returns {string[]} массив строк кода функции
 */
function generateBlockFunc(block, varNames, indent, doc, connectedBlocks) {
    const lines = [];
    const funcName = `__${block.name || block.id}`;

    if (block.type === 'action') {
        // Комментарий: описание действия
        const actionTypes = (block.actions || [])
            .map((a) => {
                switch (a.type) {
                    case 'set_variable':
                        return `установить переменную ${a.field}`;
                    case 'random_number':
                        return `сгенерировать случайное число в ${a.field}`;
                    case 'http_request':
                        return `HTTP-запрос к ${a.url || 'URL'}`;
                    default:
                        return a.type;
                }
            })
            .join(', ');
        const hasHttp = blockNeedsAsync(block, doc, connectedBlocks);
        lines.push(`/** Действие: ${actionTypes || 'выполнить действие'} */`);
        lines.push(`${hasHttp ? 'async ' : ''}function ${funcName}(ctrl: BotController) {`);
        if (block.actions) {
            for (const action of block.actions) {
                lines.push(...generateActionFunc(action, varNames, indent));
            }
        }
        // Текст действия
        if (block.text) {
            lines.push(`${indent}setText(ctrl, ${textExpr(block.text)});`);
        }
        if (block.buttons && block.buttons.length > 0) {
            lines.push(...generateButtonCode(block.buttons, indent));
        }

        // Вызов связанных блоков (response/action) и навигация
        const actionOutgoingBlocks = findOutgoingBlocks(doc, block.id, connectedBlocks);
        lines.push(
            ...generateOutgoingBlockCalls(actionOutgoingBlocks, '    ', doc, connectedBlocks),
        );

        // Навигация к следующему step/command
        const nextStep = findNextNonBlockNode(doc, block.id);
        if (nextStep && actionOutgoingBlocks.length === 0) {
            lines.push(`    ctrl.thisIntentName = '${escapeStr(nextStep.name)}';`);
        }

        lines.push(`}`);
    } else if (block.type === 'condition') {
        // Комментарий: описание условия
        const opNames = {
            eq: 'равно',
            neq: 'не равно',
            gt: 'больше',
            gte: 'больше или равно',
            lt: 'меньше',
            lte: 'меньше или равно',
            contains: 'содержит',
            isEmpty: 'пусто',
            isSayTrue: 'согласие',
            isSayFalse: 'отрицание',
            isUrl: 'ссылка',
        };
        const opName = opNames[block.operator] || block.operator;
        lines.push(
            `/** Условие: проверяем ${block.variable || 'ввод пользователя'} ${opName} ${block.value || ''} */`,
        );
        const condNeedsAsync = blockNeedsAsync(block, doc, connectedBlocks);
        lines.push(`${condNeedsAsync ? 'async ' : ''}function ${funcName}(ctrl: BotController) {`);

        // Ищем response функции для branch_true и branch_false
        let trueFuncName = null;
        let falseFuncName = null;
        let trueNavigation = null;
        let falseNavigation = null;

        const trueEdge = doc.edges.find((e) => e.from === block.id && e.type === 'branch_true');
        const falseEdge = doc.edges.find((e) => e.from === block.id && e.type === 'branch_false');

        if (trueEdge) {
            const trueNode = doc.nodes.find((n) => n.id === trueEdge.to);
            if (trueNode) {
                if (trueNode.type === 'step' || trueNode.type === 'command') {
                    // Step/command генерируются через addStep/addCommand, вызываются через thisIntentName
                    trueNavigation = `ctrl.thisIntentName = '${escapeStr(trueNode.name || trueNode.id)}'`;
                } else if (
                    trueNode.type === 'response' ||
                    trueNode.type === 'action' ||
                    trueNode.type === 'condition'
                ) {
                    trueFuncName = `__${trueNode.name || trueNode.id}`;
                }
            }
        }

        if (falseEdge) {
            const falseNode = doc.nodes.find((n) => n.id === falseEdge.to);
            if (falseNode) {
                if (falseNode.type === 'step' || falseNode.type === 'command') {
                    falseNavigation = `ctrl.thisIntentName = '${escapeStr(falseNode.name || falseNode.id)}'`;
                } else if (
                    falseNode.type === 'response' ||
                    falseNode.type === 'action' ||
                    falseNode.type === 'condition'
                ) {
                    falseFuncName = `__${falseNode.name || falseNode.id}`;
                }
            }
        }

        lines.push(
            ...generateConditionFunc(
                block,
                varNames,
                indent,
                trueFuncName,
                falseFuncName,
                trueNavigation,
                falseNavigation,
                doc,
                connectedBlocks,
            ),
        );
        lines.push(`}`);
    } else if (block.type === 'response') {
        // Комментарий: описание ответа
        const responsePreview = block.response?.text
            ? block.response.text.slice(0, 50)
            : 'пустой ответ';
        lines.push(
            `/** Ответ: "${responsePreview}${block.response?.text?.length > 50 ? '...' : ''}" */`,
        );
        const respNeedsAsync = blockNeedsAsync(block, doc, connectedBlocks);
        lines.push(`${respNeedsAsync ? 'async ' : ''}function ${funcName}(ctrl: BotController) {`);
        if (block.response) {
            if (block.response.text)
                lines.push(`${indent}setText(ctrl, ${textExpr(block.response.text)});`);
            if (block.response.tts)
                lines.push(`${indent}setTTS(ctrl, '${escapeStr(block.response.tts)}');`);
            lines.push(...generateButtonCode(block.response.buttons, indent));
            lines.push(...generateCardCode(block.response.card, indent));
        }

        // Вызов связанных блоков (response/action) и навигация
        const responseOutgoingBlocks = findOutgoingBlocks(doc, block.id, connectedBlocks);
        lines.push(
            ...generateOutgoingBlockCalls(responseOutgoingBlocks, '    ', doc, connectedBlocks),
        );

        // Навигация к следующему step/command (только если нет connected блоков)
        if (responseOutgoingBlocks.length === 0) {
            const nextStep = findNextNonBlockNode(doc, block.id);
            if (nextStep) {
                lines.push(`    ctrl.thisIntentName = '${escapeStr(nextStep.name)}';`);
            }
        }

        lines.push(`}`);
    }
    return lines;
}

/**
 * Ищет следующую command/step ноду в цепочке, пропуская action/condition/response.
 * Защита от бесконечного цикла: лимит 20 шагов.
 * @param {Object} doc — FlowDocument
 * @param {string} fromId — ID ноды, с которой начинаем поиск
 * @returns {Object|null} найденная нода или null
 */
function findNextNonBlockNode(doc, fromId) {
    let currentId = fromId;
    let safety = 0;
    while (currentId && safety < 20) {
        safety++;
        const edge = doc.edges.find((e) => e.from === currentId && e.type === 'next');
        if (!edge) return null;
        const nextNode = doc.nodes.find((n) => n.id === edge.to);
        if (!nextNode) return null;
        // Если следующий узел — command или step, возвращаем его
        if (nextNode.type === 'command' || nextNode.type === 'step') {
            return nextNode;
        }
        // Иначе идём дальше по цепочке
        currentId = nextNode.id;
    }
    return null;
}

/**
 * Главная функция генерации. Создаёт полный src/index.ts из FlowDocument.
 * @param {Object} doc — FlowDocument с узлами, рёбрами и настройками
 * @returns {string} содержимое src/index.ts
 */
function generateIndexTs(doc, useCloud = false) {
    const lines = [];
    const varNames = collectVarNames(doc);

    // Собираем все связанные блоки (action/condition/response)
    const connectedBlocks = [];
    for (const node of doc.nodes) {
        if (node.type === 'action' || node.type === 'condition' || node.type === 'response') {
            // Проверяем, есть ли входящая связь от command/step
            const hasIncoming = doc.edges.some((e) => e.to === node.id);
            if (hasIncoming) {
                connectedBlocks.push(node);
            }
        }
    }

    const needsRand =
        doc.nodes.some((n) => n.actions && n.actions.some((a) => a.type === 'random_number')) ||
        connectedBlocks.some((n) => n.actions && n.actions.some((a) => a.type === 'random_number'));
    // Проверяем, нужны ли Text методы (для условий с isSayTrue, isSayFalse, isUrl)
    const needsTextMethods = (conds) => {
        if (!conds) return false;
        return conds.some((c) => ['isSayTrue', 'isSayFalse', 'isUrl'].includes(c.operator));
    };
    const needsText =
        doc.nodes.some((n) => needsTextMethods(n.conditions)) ||
        connectedBlocks.some((n) => needsTextMethods(n.conditions)) ||
        doc.nodes.some((n) => n.type === 'command' && needsTextMethods(n.conditions)) ||
        doc.nodes.some((n) => n.type === 'step' && needsTextMethods(n.conditions)) ||
        doc.nodes.some(
            (n) =>
                n.type === 'condition' && ['isSayTrue', 'isSayFalse', 'isUrl'].includes(n.operator),
        );

    // Импорты
    const umbotImports = ['Bot', 'BotController', 'FALLBACK_COMMAND'];
    // Проверяем есть ли welcome/help команды — импортируем константы
    const hasWelcome = doc.nodes.some(
        (n) => n.type === 'command' && (n.name === 'welcome' || n.role === 'welcome'),
    );
    const hasHelp = doc.nodes.some(
        (n) => n.type === 'command' && (n.name === 'help' || n.role === 'help'),
    );
    if (hasWelcome) umbotImports.push('WELCOME_INTENT_NAME');
    if (hasHelp) umbotImports.push('HELP_INTENT_NAME');
    if (needsText) umbotImports.push('Text');
    lines.push(`import { ${umbotImports.join(', ')} } from 'umbot';`);

    // Проверяем нужны ли setText/setTTS
    const needsTTS =
        doc.nodes.some((n) => {
            if (n.type === 'command' && n.response?.tts) return true;
            if (n.type === 'step' && n.prompt?.tts) return true;
            if (n.type === 'response' && n.response?.tts) return true;
            return false;
        }) ||
        connectedBlocks.some((n) => {
            if (n.response?.tts) return true;
            if (n.prompt?.tts) return true;
            return false;
        });
    if (needsTTS) {
        lines.push(`import { setText, setTTS } from './utils';`);
    } else {
        lines.push(`import { setText } from './utils';`);
    }

    // Обработка платформ
    const platforms = doc.platforms || [];
    const ALL_PLATFORMS = ['alisa', 'telegram', 'vk', 'marusia', 'max_app', 'viber', 'smart_app'];
    const VOICE_PLATFORMS = ['alisa', 'marusia', 'smart_app'];
    const CHAT_PLATFORMS = ['telegram', 'vk', 'max_app', 'viber'];

    // Маппинг платформ на адаптеры
    const PLATFORM_ADAPTERS = {
        alisa: 'AlisaAdapter',
        telegram: 'TelegramAdapter',
        vk: 'VkAdapter',
        marusia: 'MarusiaAdapter',
        max_app: 'MaxAdapter',
        viber: 'ViberAdapter',
        smart_app: 'SmartAppAdapter',
    };

    // Определяем, какие платформы подключать
    const allSelected = platforms.length === 0 || platforms.length === ALL_PLATFORMS.length;
    const voiceOnly = platforms.length > 0 && platforms.every((p) => VOICE_PLATFORMS.includes(p));
    const chatOnly = platforms.length > 0 && platforms.every((p) => CHAT_PLATFORMS.includes(p));

    if (allSelected) {
        lines.push(`import { fullPlatforms } from 'umbot/plugins';`);
    } else if (voiceOnly) {
        lines.push(`import { voicePlatforms } from 'umbot/plugins';`);
    } else if (chatOnly) {
        lines.push(`import { botPlatforms } from 'umbot/plugins';`);
    } else {
        // Импортируем только выбранные адаптеры
        const adapterNames = platforms.map((p) => PLATFORM_ADAPTERS[p]).filter(Boolean);
        if (adapterNames.length > 0) {
            lines.push(`import { ${adapterNames.join(', ')} } from 'umbot/plugins';`);
        }
    }

    if (doc.database && doc.database.type === 'file') {
        lines.push(`import { FileAdapter } from 'umbot/plugins';`);
    } else if (doc.database && doc.database.type === 'mongo') {
        lines.push(`import { MongoAdapter } from 'umbot/plugins';`);
    }
    if (needsRand) lines.push(`import { rand } from 'umbot/utils';`);
    // Text уже импортируется из umbot, не нужен отдельный импорт из umbot/utils

    lines.push(``);
    lines.push(`const bot = new Bot();`);
    lines.push(``);

    // Регистрация платформ
    if (allSelected) {
        lines.push(`bot.use(fullPlatforms);`);
    } else if (voiceOnly) {
        lines.push(`bot.use(voicePlatforms);`);
    } else if (chatOnly) {
        lines.push(`bot.use(botPlatforms);`);
    } else {
        // Регистрируем только выбранные адаптеры
        const adapterNames = platforms.map((p) => PLATFORM_ADAPTERS[p]).filter(Boolean);
        for (const name of adapterNames) {
            lines.push(`bot.use(new ${name}());`);
        }
    }
    lines.push(``);

    if (doc.database && doc.database.type === 'file') {
        lines.push(`bot.use(new FileAdapter());`);
    } else if (doc.database && doc.database.type === 'mongo') {
        const dbConfig = doc.database.config || {};
        lines.push(
            `bot.use(new MongoAdapter({ host: 'localhost', database: '${escapeStr(dbConfig.database || 'bot_db')}' }));`,
        );
    }
    lines.push(``);

    lines.push(`bot.setAppConfig({`);
    if (doc.isLocalStorage === true) {
        lines.push(`    isLocalStorage: true,`);
    }
    lines.push(`});`);
    lines.push(``);

    lines.push(`bot.setPlatformParams({`);
    lines.push(`    welcome_text: '${escapeStr((doc.welcome && doc.welcome.text) || '')}',`);
    lines.push(
        `    help_text: '${escapeStr((doc.helpText && doc.helpText.text) || (doc.fallback && doc.fallback.text) || '')}',`,
    );
    lines.push(`    empty_text: '${escapeStr((doc.fallback && doc.fallback.text) || '')}',`);
    lines.push(`    intents: [],`);
    lines.push(`});`);
    lines.push(``);

    // Генерируем функции для связанных блоков
    if (connectedBlocks.length > 0) {
        lines.push(`// --- Переиспользуемые функции ---`);
        for (const block of connectedBlocks) {
            lines.push(...generateBlockFunc(block, varNames, '    ', doc, connectedBlocks));
            lines.push(``);
        }
    }

    // Регистрация команд
    for (const node of doc.nodes) {
        if (node.type !== 'command') continue;
        const cmd = node;

        const slotsStr = (cmd.slots || []).map((s) => `'${escapeStr(s)}'`).join(', ');
        const isPattern = cmd.isPattern ? ', true' : '';
        const isAsync =
            (cmd.actions || []).some((a) => a.type === 'http_request') ||
            blockNeedsAsync(cmd, doc, connectedBlocks);

        // Определяем имя команды: welcome/help используют константы
        const isWelcome = cmd.name === 'welcome' || cmd.role === 'welcome';
        const isHelp = cmd.name === 'help' || cmd.role === 'help';
        const cmdName = isWelcome
            ? 'WELCOME_INTENT_NAME'
            : isHelp
              ? 'HELP_INTENT_NAME'
              : `'${escapeStr(cmd.name)}'`;

        // Комментарий: описание команды
        const slotsPreview = (cmd.slots || []).slice(0, 3).join(', ');
        const commentName = isWelcome ? 'welcome (Старт)' : isHelp ? 'help (Помощь)' : cmd.name;
        lines.push(
            `/** Команда "${commentName}": активируется на [${slotsPreview}${(cmd.slots || []).length > 3 ? '...' : ''}] */`,
        );
        lines.push(
            `bot.addCommand(${cmdName}, [${slotsStr}]${isPattern}, ${isAsync ? 'async ' : ''}(cmd: string, ctrl: BotController) => {`,
        );

        // Инлайн действия
        if (cmd.actions) {
            for (const action of cmd.actions) {
                lines.push(...generateActionFunc(action, varNames, '    '));
            }
        }

        // Инлайн условия — обрабатываем targetNodeId для навигации
        if (cmd.conditions) {
            for (const cond of cmd.conditions) {
                let trueNavigation = null;
                let falseNavigation = null;
                if (cond.targetNodeId) {
                    const targetNode = doc.nodes.find((n) => n.id === cond.targetNodeId);
                    if (
                        targetNode &&
                        (targetNode.type === 'step' || targetNode.type === 'command')
                    ) {
                        trueNavigation = `ctrl.thisIntentName = '${escapeStr(targetNode.name || targetNode.id)}'`;
                    }
                }
                lines.push(
                    ...generateConditionFunc(
                        cond,
                        varNames,
                        '    ',
                        null,
                        null,
                        trueNavigation,
                        falseNavigation,
                        doc,
                        connectedBlocks,
                    ),
                );
            }
        }

        // Вызов связанных блоков (включая branch_true/branch_false от условий)
        const outgoingBlocks = findOutgoingBlocks(doc, cmd.id, connectedBlocks);
        lines.push(...generateOutgoingBlockCalls(outgoingBlocks, '    ', doc, connectedBlocks));

        // Текст (только если нет подключённых блоков с текстом)
        if (cmd.response && cmd.response.text && !hasTextFromBlocks(outgoingBlocks)) {
            lines.push(`    setText(ctrl, ${textExpr(cmd.response.text)});`);
        }
        if (cmd.response && cmd.response.tts) {
            lines.push(`    setTTS(ctrl, '${escapeStr(cmd.response.tts)}');`);
        }
        if (cmd.response && cmd.response.isEnd) {
            lines.push(`    ctrl.isEnd = true;`);
        }
        if (cmd.response && cmd.response.buttons) {
            lines.push(
                ...generateButtonCode(cmd.response.buttons, '    ', cmd.response.shuffleButtons),
            );
        }
        if (cmd.response && cmd.response.card) {
            lines.push(...generateCardCode(cmd.response.card, '    '));
        }
        if (cmd.saveTo && cmd.saveTo.trim()) {
            lines.push(`    ${userDataAccess(cmd.saveTo)} = cmd;`);
        }

        // Навигация: найти следующий command/step в цепочке
        // Только если нет условий с targetNodeId (иначе условие само навигирует)
        const hasConditionWithTarget = (cmd.conditions || []).some((c) => c.targetNodeId);
        if (!hasConditionWithTarget) {
            const nextStep = findNextNonBlockNode(doc, cmd.id);
            if (nextStep) {
                lines.push(`    ctrl.thisIntentName = '${escapeStr(nextStep.name)}';`);
            }
        }

        lines.push(`});`);
        lines.push(``);
    }

    // Регистрация шагов
    for (const node of doc.nodes) {
        if (node.type !== 'step') continue;
        const step = node;

        const isAsync =
            (step.actions || []).some((a) => a.type === 'http_request') ||
            blockNeedsAsync(step, doc, connectedBlocks);

        // Комментарий: описание шага
        const promptPreview = step.prompt?.text ? step.prompt.text.slice(0, 40) : '';
        const saveInfo = step.saveTo ? `, сохраняет в ${step.saveTo}` : '';
        lines.push(
            `/** Шаг "${step.name}": ${promptPreview ? `"${promptPreview}..."` : 'ожидание ввода'}${saveInfo} */`,
        );
        lines.push(
            `bot.addStep('${escapeStr(step.name)}', ${isAsync ? 'async ' : ''}(ctrl: BotController) => {`,
        );

        // Текст
        if (step.prompt && step.prompt.text) {
            lines.push(`    setText(ctrl, ${textExpr(step.prompt.text)});`);
        }
        if (step.prompt && step.prompt.tts) {
            lines.push(`    setTTS(ctrl, '${escapeStr(step.prompt.tts)}');`);
        }
        if (step.prompt && step.prompt.buttons) {
            lines.push(
                ...generateButtonCode(step.prompt.buttons, '    ', step.prompt.shuffleButtons),
            );
        }

        // saveTo
        if (step.saveTo && step.saveTo.trim()) {
            const saveExpr =
                step.saveAs === 'lowercase'
                    ? `(ctrl.userCommand ?? '').toLowerCase()`
                    : `ctrl.userCommand ?? ''`;
            lines.push(`    ${userDataAccess(step.saveTo)} = ${saveExpr};`);
        }

        // Инлайн действия
        if (step.actions) {
            for (const action of step.actions) {
                lines.push(...generateActionFunc(action, varNames, '    '));
            }
        }

        // Инлайн условия — обрабатываем targetNodeId для навигации
        if (step.conditions) {
            for (const cond of step.conditions) {
                let trueNavigation = null;
                let falseNavigation = null;
                if (cond.targetNodeId) {
                    const targetNode = doc.nodes.find((n) => n.id === cond.targetNodeId);
                    if (
                        targetNode &&
                        (targetNode.type === 'step' || targetNode.type === 'command')
                    ) {
                        trueNavigation = `ctrl.thisIntentName = '${escapeStr(targetNode.name || targetNode.id)}'`;
                    }
                }
                lines.push(
                    ...generateConditionFunc(
                        cond,
                        varNames,
                        '    ',
                        null,
                        null,
                        trueNavigation,
                        falseNavigation,
                        doc,
                        connectedBlocks,
                    ),
                );
            }
        }

        // Вызов связанных блоков (включая branch_true/branch_false от условий)
        const outgoingBlocks = findOutgoingBlocks(doc, step.id, connectedBlocks);
        lines.push(...generateOutgoingBlockCalls(outgoingBlocks, '    ', doc, connectedBlocks));

        // Навигация: найти следующий command/step в цепочке
        // Только если нет условий с targetNodeId
        const stepHasConditionWithTarget = (step.conditions || []).some((c) => c.targetNodeId);
        if (!stepHasConditionWithTarget) {
            const nextStepNode = findNextNonBlockNode(doc, step.id);
            if (nextStepNode) {
                lines.push(`    ctrl.thisIntentName = '${escapeStr(nextStepNode.name)}';`);
            }
        }

        lines.push(`});`);
        lines.push(``);
    }

    // Fallback
    lines.push(`bot.addCommand(FALLBACK_COMMAND, [], (cmd: string, ctrl: BotController) => {`);
    lines.push(
        `    setText(ctrl, '${escapeStr((doc.fallback && doc.fallback.text) || 'Извините, я вас не понял.')}');`,
    );
    lines.push(`});`);
    lines.push(``);

    lines.push(`bot.start('localhost', 3000);`);
    lines.push(``);

    // Если useCloud — добавляем экспорт cloud function handler
    if (useCloud) {
        lines.push(``);
        lines.push(`// --- Yandex Cloud Function handler ---`);
        lines.push(`export const handler = async (event: Record<string, unknown>) => {`);
        lines.push(
            `    const content = typeof event.body === 'string' ? event.body : JSON.stringify(event.body);`,
        );
        lines.push(`    bot.setContent(content);`);
        lines.push(`    const result = await bot.run();`);
        lines.push(`    return {`);
        lines.push(`        statusCode: 200,`);
        lines.push(`        headers: { 'Content-Type': 'application/json' },`);
        lines.push(`        body: typeof result === 'string' ? result : JSON.stringify(result),`);
        lines.push(`    };`);
        lines.push(`};`);
    }
    return lines.join('\n');
}

/**
 * Генерирует содержимое package.json с именем проекта и зависимостями.
 * @param {Object} doc — FlowDocument
 * @returns {string} JSON-строка package.json
 */
function generatePackageJson(doc) {
    const pkg = {
        name: (doc.name || 'my-bot').replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
        version: doc.version || '1.0.0',
        main: './dist/index.js',
        scripts: { start: 'node ./dist/index.js', build: 'tsc' },
        dependencies: { umbot: '^3.0.0' },
        devDependencies: { typescript: '^5.7.0' },
    };
    return JSON.stringify(pkg, null, 2);
}

/** Генерирует содержимое tsconfig.json для TypeScript-проекта. @returns {string} JSON-строка */
function generateTsConfig() {
    return JSON.stringify(
        {
            compilerOptions: {
                target: 'es2023',
                module: 'Node16',
                moduleResolution: 'Node16',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                outDir: './dist',
                rootDir: './src',
            },
            include: ['src/**/*'],
        },
        null,
        2,
    );
}

function generateGitIgnore() {
    const file = __dirname + '/template';
    if (file && utils.isFile(file)) {
        return utils.fread(file);
    }
    return '';
}

/** Генерирует src/utils.ts с вспомогательными функциями setText и setTTS. @returns {string} содержимое файла */
function generateUtils() {
    return `import { BotController } from 'umbot';

/**
 * Установить текст ответа. Если текст уже задан — добавляет через \\n.
 */
export function setText(ctrl: BotController, text: string): void {
    if (ctrl.text) {
        ctrl.text += \`\\n\${text}\`;
    } else {
        ctrl.text = text;
    }
}

/**
 * Установить TTS. Если TTS уже задан — добавляет через пробел.
 */
export function setTTS(ctrl: BotController, text: string): void {
    if (ctrl.tts) {
        ctrl.tts += \` \${text}\`;
    } else {
        ctrl.tts = text;
    }
}
`;
}

/**
 * Точка входа генератора. Читает JSON, валидирует, генерирует все файлы и записывает на диск.
 * @param {string} flowJsonPath — путь к flow.json
 * @param {string} outputPath — путь к выходной директории проекта
 * @throws {Error} при невалидном JSON или отсутствии обязательных полей
 */
function generateFromFlow(flowJsonPath, outputPath, options = {}) {
    if (!fs.existsSync(flowJsonPath)) {
        throw new Error(`Файл не найден: ${flowJsonPath}`);
    }

    const content = fs.readFileSync(flowJsonPath, 'utf8');
    let doc;
    try {
        doc = JSON.parse(content);
    } catch (e) {
        throw new Error(`Ошибка парсинга JSON: ${e.message}`);
    }

    if (!doc.name) throw new Error('В JSON отсутствует поле "name"');
    if (!doc.nodes || !Array.isArray(doc.nodes)) throw new Error('В JSON отсутствует поле "nodes"');
    if (!doc.edges || !Array.isArray(doc.edges)) doc.edges = [];
    if (!doc.welcome) doc.welcome = { text: 'Привет!', buttons: [] };
    if (!doc.fallback) doc.fallback = { text: 'Извините, я вас не понял.' };
    if (!doc.platforms || !Array.isArray(doc.platforms)) doc.platforms = ['telegram'];
    if (!doc.database) doc.database = { type: 'file', config: {} };

    // Валидация имён переменных
    const warnings = [];
    for (const node of doc.nodes) {
        if ((node.type === 'command' || node.type === 'step') && node.saveTo) {
            if (!isValidJSIdentifier(node.saveTo)) {
                warnings.push(
                    `Блок "${node.name}": имя переменной "${node.saveTo}" не является валидным JS-идентификатором. Будет использован скобочный синтаксис.`,
                );
            }
        }
        if (node.actions) {
            for (const action of node.actions) {
                if (action.field && !isValidJSIdentifier(action.field)) {
                    warnings.push(
                        `Блок "${node.name}": имя переменной "${action.field}" не является валидным JS-идентификатором.`,
                    );
                }
            }
        }
    }
    if (warnings.length > 0) {
        console.warn('\n⚠️ Предупреждения:');
        warnings.forEach((w) => console.warn(`  - ${w}`));
        console.log('');
    }

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const srcDir = path.join(outputPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'index.ts'), generateIndexTs(doc, options.useCloud), 'utf8');
    fs.writeFileSync(path.join(srcDir, 'utils.ts'), generateUtils(), 'utf8');
    fs.writeFileSync(path.join(outputPath, 'package.json'), generatePackageJson(doc), 'utf8');
    fs.writeFileSync(path.join(outputPath, 'tsconfig.json'), generateTsConfig(), 'utf8');
    fs.writeFileSync(path.join(outputPath, '.gitignore'), generateGitIgnore(), 'utf8');

    // Генерация .env файла если есть токены
    const TOKEN_ENV_NAMES = {
        telegram: 'TELEGRAM_TOKEN',
        vk: 'VK_TOKEN',
        alisa: 'ALISA_TOKEN',
        marusia: 'MARUSIA_TOKEN',
        smart_app: 'SMARTAPP_TOKEN',
        max_app: 'MAX_TOKEN',
        viber: 'VIBER_TOKEN',
    };
    const tokens = doc.tokens || {};
    const tokenEntries = Object.entries(tokens).filter(([, v]) => v && v.trim());
    if (tokenEntries.length > 0) {
        const envLines = tokenEntries.map(([platform, token]) => {
            const envName = TOKEN_ENV_NAMES[platform] || `${platform.toUpperCase()}_TOKEN`;
            return `${envName}=${token}`;
        });
        fs.writeFileSync(path.join(outputPath, '.env'), envLines.join('\n') + '\n', 'utf8');
        console.log('  .env');
    }

    // Генерация для Yandex Cloud Functions
    if (options.useCloud) {
        const pkg = JSON.parse(fs.readFileSync(path.join(outputPath, 'package.json'), 'utf8'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.deploy =
            'yc serverless function invoke ' + (doc.name || 'my-bot') + ' --file-path src/index.js';
        pkg.scripts.build = 'tsc';
        fs.writeFileSync(
            path.join(outputPath, 'package.json'),
            JSON.stringify(pkg, null, 4) + '\n',
            'utf8',
        );

        const serverlessYml = `functions:
  - name: ${doc.name || 'my-bot'}
    runtime: nodejs18
    entrypoint: src/index.handler
    memory: 128m
    environment:
${
    tokenEntries.length > 0
        ? tokenEntries
              .map(([platform, token]) => {
                  const envName = TOKEN_ENV_NAMES[platform] || `${platform.toUpperCase()}_TOKEN`;
                  return `      ${envName}: "${token}"`;
              })
              .join('\n')
        : '      # Добавьте переменные окружения here'
}
    secrets:
      - id: ${doc.name || 'my-bot'}-secrets
        version: latest
`;
        fs.writeFileSync(path.join(outputPath, 'serverless.yml'), serverlessYml, 'utf8');
        console.log('  serverless.yml');
    }

    console.log(`Проект успешно создан в: ${outputPath}`);
    console.log(`Файлы:`);
    console.log(`  src/index.ts`);
    console.log(`  src/utils.ts`);
    console.log(`  package.json`);
    console.log(`  tsconfig.json`);
}

module.exports = { generateFromFlow };
