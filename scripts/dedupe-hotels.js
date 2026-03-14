const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src/data/luxury_hotels.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const seen = new Set();
const unique = [];

for (const hotel of data.hotels) {
  const key = `${hotel.name}|${hotel.countryCode}|${hotel.cityName}`;
  if (seen.has(key)) {
    console.log('Remove duplicate:', hotel.id, hotel.name, hotel.cityName);
    continue;
  }
  seen.add(key);
  unique.push(hotel);
}

console.log('Total before:', data.hotels.length);
console.log('Total after:', unique.length);
console.log('Removed:', data.hotels.length - unique.length);

data.hotels = unique;
fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Written:', filePath);
