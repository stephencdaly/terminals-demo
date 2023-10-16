import express from 'express'

import logger from './logger'

const app = express()
const port = 8080

app.get('/', (req, res) => { res.send('Hello world!')})

app.listen(port, () => logger.info(`server started on port ${port}`))