console.log('Starting simple test...');

const express = require('express');
console.log('Express loaded successfully');

const app = express();
console.log('Express app created');

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});

