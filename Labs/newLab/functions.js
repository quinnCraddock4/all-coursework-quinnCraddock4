function vowelCount (str){
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (vowels.includes(str[i].toLowerCase())) {
            count++;
        }
    }
    return count;
}

function reverseString(str) {
    return str.split('').reverse().join('');
}

function capitalizeWord(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function wordCount(str) {
    const words = str.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
}

function concatenateStrings(str1, str2) {
    return str1 + str2;
}
wordCount("Hello world"); 