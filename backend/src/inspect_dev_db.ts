import fs from 'fs';
import path from 'path';

const devDbPath = path.resolve(__dirname, '../prisma/dev.db');
console.log('dev.db path:', devDbPath);
console.log('dev.db exists:', fs.existsSync(devDbPath));
if (fs.existsSync(devDbPath)) {
  const stat = fs.statSync(devDbPath);
  console.log('dev.db size:', stat.size, 'bytes');
  
  // Read header / buffer to see string matches
  const buffer = fs.readFileSync(devDbPath);
  const str = buffer.toString('utf8');
  console.log('Contains "User" table marker:', str.includes('User'));
  console.log('Contains "EmailJob" table marker:', str.includes('EmailJob'));
  console.log('Contains "googleId" or emails:', str.includes('googleId'), str.includes('@gmail.com'));
  
  // Find potential email strings in dev.db
  const matches = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  console.log('Emails found in dev.db:', matches);
}
