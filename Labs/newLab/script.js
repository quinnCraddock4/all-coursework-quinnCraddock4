const SECRET_NUMBER = 42;

function checkGuess() {
    let userInput = document.getElementById('userInput').value;
    if (userInput == SECRET_NUMBER) {
        document.getElementById('message').innerText = `Correct!`;
    } 
    else if(userInput === ''){
        document.getElementById('message').innerText = "Please enter a guess";
        document.getElementById('datatype').innerText = "Data type: null";
    }
    else {
        document.getElementById('message').innerText = "Try again!";
    }

}

function getValue() {
    const userInput = document.getElementById('userInput').value;
    let valueToCheck;
    if (userInput.trim() === "") {
        valueToCheck = "";
    } else if (Number(userInput) && userInput.trim() !== "") {
        valueToCheck = Number(userInput);
    } else if (userInput === "false") {
        valueToCheck = false;
    } else if (userInput === "true") {
        valueToCheck = true;
    } else if (userInput === "null") {
        valueToCheck = null;
    } else if (userInput === "undefined") {
        valueToCheck = undefined;
    } else if (userInput === "NaN") {
        valueToCheck = NaN;
    } else {
        valueToCheck = userInput;
    }
    if (valueToCheck) {
        document.getElementById('message').innerText = `"${userInput}" is truthy.`;
    } else {
        document.getElementById('message').innerText = `"${userInput}" is falsy.`;
    }
    document.getElementById('datatype').innerText = `Type: ${typeof valueToCheck}`;
}