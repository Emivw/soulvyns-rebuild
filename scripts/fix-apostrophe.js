const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');
const bad = '\u2019';
const good = "'";

const files = [
  'app/counselor/dashboard/page.tsx',
  'app/register/page.tsx',
  'app/layout.tsx',
  'components/Footer.tsx',
  'components/Navbar.tsx',
  'components/Providers.tsx',
];

files.forEach((f) => {
  const full = path.join(dir, f);
  try {
    let s = fs.readFileSync(full, 'utf8');
    if (s.includes(bad)) {
      s = s.split(bad).join(good);
      fs.writeFileSync(full, s);
      console.log('Fixed:', f);
    }
  } catch (e) {
    console.log('Skip', f, e.message);
  }
});
