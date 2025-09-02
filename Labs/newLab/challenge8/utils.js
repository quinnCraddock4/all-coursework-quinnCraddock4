const colors = ['Red', 'Green', 'Blue', 'Yellow', 'Purple', 'Orange'];

function getRandomNumber() {
    return Math.floor(Math.random() * 100) + 1;
}

function getRandomColor() {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

export { getRandomNumber, getRandomColor };