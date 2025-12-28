const app = require('./app');

// Exportar para Vercel (Serverless)
module.exports = app;

// Solo iniciar el servidor si no estamos en Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor API profesional corriendo en http://0.0.0.0:${PORT}`);
  });
}