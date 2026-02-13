import Fastify, {FastifyInstance} from 'fastify';

const app: FastifyInstance = Fastify({logger: true});

app.get('/ping', async () => {
    return {message: 'pong'};
});

const start = async () => {
    try {
        await app.listen({port: 3000, host: '0.0.0.0'});
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
