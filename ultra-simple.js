console.log('Starting ultra simple server...');

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Ultra simple server working!' });
});

const PORT = 9002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
