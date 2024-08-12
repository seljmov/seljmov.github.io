function findMinMax(values) {
    let min = Infinity;
    let max = -Infinity;

    for (const value of values) {
        if (value < min) min = value;
        if (value > max) max = value;
    }

    return { min, max };
}

async function getRandomNumberBetweenMinMax(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();
        const values = Object.values(data);

        if (!values.length) {
            console.log("В JSON-данных нет значений.");
            return;
        }

        if (!values.every(value => typeof value === 'number')) {
            throw new Error('Некоторые значения не являются числами.');
        }

        // Найти min и max
        const min = values[0];
        const max = values[values.length - 1];

        // Генерация случайного числа между min и max
        const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;

        console.log("Случайное число: " + randomValue);
        return randomValue;
    } catch (error) {
        alert("Произошла ошибка: " + error.message);
        console.error("Произошла ошибка:", error);
    }
}


async function isWithinMinMax(filePath, number) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();
        const values = Object.values(data);

        if (values.length === 0) {
            console.log("В JSON-данных нет значений.");
            return false;
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        // Проверяем, находится ли число в диапазоне
        return number >= minValue && number <= maxValue;
    } catch (error) {
        console.error("Произошла ошибка:", error);
        return false;
    }
}