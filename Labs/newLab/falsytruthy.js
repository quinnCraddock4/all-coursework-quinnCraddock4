function getValue() {
    const userInput = document.getElementById('userInput').value;
    let isTruthy = Boolean(userInput);
    if (isTruthy) {
        document.getElementById('message').innerText = `"${userInput}" is truthy.`;
    } else {
        document.getElementById('message').innerText = `"${userInput}" is falsy.`;
    }
    document.getElementById('datatype').innerText = `Type: ${typeof userInput}`;
}