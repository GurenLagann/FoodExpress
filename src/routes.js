import { Router } from 'express';
import UserConttroller from './app/controllers/UserController';

const routes = new Router();

routes.post('/users', UserConttroller.store);

export default routes;
