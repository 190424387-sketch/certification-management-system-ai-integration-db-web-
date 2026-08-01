const fs = require('fs');
const path = 'src/data/custom_mappings.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const newData = {};
let changedCount = 0;
for (const [key, value] of Object.entries(data)) {
  if (key.includes('...')) {
    const newKey = key.replace(/\.\.\.$/, '').trim();
    if (newKey) {
       newData[newKey] = value;
       changedCount++;
    }
  } else {
    newData[key] = value;
  }
}

fs.writeFileSync(path, JSON.stringify(newData, null, 2) + '\n');
console.log('Cleaned ' + changedCount + ' mappings containing "..."');
