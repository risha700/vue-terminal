var fs = require('fs')

module.exports = {
    devServer: {
      open: process.platform === 'darwin',
      host: '0.0.0.0',
      port: 8080,
      https: {
        key: fs.readFileSync('cert/server.key'),
        cert: fs.readFileSync('cert/server.crt'),
      },
      compress: true,
      disableHostCheck: true,
      hotOnly: false,
    },
  }