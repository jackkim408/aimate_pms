import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import actionsRouter from './routes/actions';
import keywordsRouter from './routes/keywords';
import usersRouter from './routes/users';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/keywords', keywordsRouter);
app.use('/api/users', usersRouter);

app.use(errorHandler);

io.on('connection', (socket) => {
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });
});

export { io };

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
