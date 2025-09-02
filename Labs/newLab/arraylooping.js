const usernames = ["Alice", "Bob", "Charlie", "David"];

function searchUsername() {
    const userInput = document.getElementById('userInput').value;
    const found = usernames.includes(userInput);
    if (found) {
        document.getElementById('message').innerText = `Username "${userInput}" found.`;
    } else {
        document.getElementById('message').innerText = `Username "${userInput}" not found.`;
    }
}