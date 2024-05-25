import { CloudflareD1Connection, Outerbase, OuterbaseConnection, equalsNumber } from '../dist/index.js';
import express from 'express';

const app = express();
const port = 4000;

app.get('/', async (req, res) => {
    const data = {}
    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
