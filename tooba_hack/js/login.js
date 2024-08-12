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

        // Убедимся, что все значения в массиве - числа
        if (!values.every(value => typeof value === 'number')) {
            throw new Error('Некоторые значения не являются числами.');
        }

        const minValue = Math.min(Array.from(values));
        const maxValue = Math.max(Array.from(values));

        console.log("Минимальное значение:", minValue);
        console.log("Максимальное значение:", maxValue);

        // Генерация случайного числа между minValue и maxValue
        const pseudoRandomValue = Math.random() * (maxValue - minValue) + minValue;

        console.log("Случайное число:", pseudoRandomValue);
        return pseudoRandomValue;
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