import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const tableSize = await rl.question('How big do you want the table to be? ');

// make a x by x multiplication table where x = tableSize
const multiplicationTable = [];
for (let i = 1; i <= tableSize; i++) {
  const row = [];
  for (let j = 1; j <= tableSize; j++) {
    row.push(i * j);
  }
  multiplicationTable.push(row);
}

// Print the multiplication table
console.log(multiplicationTable.map(row => row.join('\t')).join('\n'));

rl.close();