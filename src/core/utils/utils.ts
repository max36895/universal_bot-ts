const REG_DANGEROUS = /\)+\s*[+*{?]|}\s*[+*{?]/;
const REG_PIPE = /\([^)]*\|[^)]*\)/;
const REG_EV1 = /\([^)]*(\w)\1+[^)]*\|/;
const REG_EV2 = /\([^)]*[+*{][^)]*\|/;
const REG_REPEAT = /\([^)]*[+*{][^)]*\)\s*\{/;
const REG_BAD = /\.\s*[+*{]/;

export function isRegexLikelySafe(pattern: string, isRegex: boolean): boolean {
    try {
        if (!isRegex) {
            new RegExp(pattern);
        }
        // 1. Защита от слишком длинных шаблонов (DoS через размер)
        if (pattern.length > 1000) {
            return false;
        }

        // 2. Убираем экранированные символы из рассмотрения (упрощённо)
        // Для простоты будем искать только в "сыром" виде — этого достаточно для эвристик

        // 3. Основные ReDoS-эвристики

        // Вложенные квантификаторы: (a+)+, (a*)*, [a-z]+*, и т.п.
        // Ищем: закрывающая скобка или символ класса, за которой следует квантификатор
        const dangerousNested = REG_DANGEROUS.test(pattern);
        if (dangerousNested) {
            return false;
        }

        // Альтернативы с пересекающимися паттернами: (a|aa), (a|a+)
        // Простой признак: один терм — префикс другого
        // Точное определение сложно без AST, но часто такие паттерны содержат:
        // - `|` внутри группы + повторяющиеся символы
        const hasPipeInGroup = REG_PIPE.test(pattern);
        if (hasPipeInGroup) {
            // Дополнительная эвристика: есть ли повторяющиеся символы или квантификаторы?
            if (REG_EV1.test(pattern)) {
                return false;
            }
            if (REG_EV2.test(pattern)) {
                return false;
            }
        }

        // Повторяющиеся квантифицируемые группы: (a+){10,100}
        if (REG_REPEAT.test(pattern)) {
            return false;
        }

        // Квантификаторы на "жадных" конструкциях без якорей — сложнее ловить,
        // но если есть .*+ — это почти всегда опасно
        if (REG_BAD.test(pattern)) {
            return false;
        }

        // Слишком глубокая вложенность скобок — признак сложности
        let depth = 0;
        let maxDepth = 0;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '\\' && i + 1 < pattern.length) {
                i++; // пропускаем экранированный символ
                continue;
            }
            if (pattern[i] === '(') depth++;
            else if (pattern[i] === ')') depth--;
            if (depth < 0) {
                return false; // некорректная скобочная структура
            }
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
        return maxDepth <= 5;
    } catch {
        return false;
    }
}
