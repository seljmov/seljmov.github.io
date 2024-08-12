async function getRandomNumberBetweenMinMax(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();
        const values = Object.values(data);

        if (values.length === 0) {
            console.log("В JSON-данных нет значений.");
            return;
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        console.log("Минимальное значение:", minValue);
        console.log("Максимальное значение:", maxValue);

        // Генерация случайного числа между minValue и maxValue
        const randomValue = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;

        console.log("Случайное число:", randomValue);
        return randomValue;
    } catch (error) {
        console.error("Произошла ошибка:", error);
    }
}

function isWithinMinMax(filePath, number) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка загрузки файла: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const values = Object.values(data);

            if (values.length === 0) {
                console.log("В JSON-данных нет значений.");
                return false;
            }

            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);

            // Проверяем, находится ли число в диапазоне
            return number >= minValue && number <= maxValue;
        })
        .catch(error => {
            console.error("Произошла ошибка:", error);
            return false;
        });
}