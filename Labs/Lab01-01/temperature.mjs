import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const type = await rl.question('Celsius or Fahrenheit (C or F) ');

if (type.toUpperCase() === 'C') {
    const celsius = await rl.question('Enter temperature in Celsius: ');
    const fahrenheit = (celsius * 9/5) + 32;
    console.log(`Temperature in Fahrenheit: ${fahrenheit}`);
} else if (type.toUpperCase() === 'F') {
    const fahrenheit = await rl.question('Enter temperature in Fahrenheit: ');
    const celsius = (fahrenheit - 32) * 5/9;
    console.log(`Temperature in Celsius: ${celsius}`);
} else {
    console.log('Invalid input. Please enter C or F.');
}

rl.close();