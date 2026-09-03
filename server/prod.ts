process.env.NODE_ENV = 'production';

import express from 'express';
import path from 'path';
import app from './app';

const PORT = Number(process.env.PORT) || 3000;
const distPath = path.join(process.cwd(), 'dist');

app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SCN Catalog Server running on http://localhost:${PORT}`);
});
