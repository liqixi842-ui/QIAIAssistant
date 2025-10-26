// PM2 配置文件 - 动「QI」来 1.0
module.exports = {
  apps: [{
    name: 'dongqilai-1.0',
    script: 'server/index.js',
    instances: 2,  // 使用2个进程
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    // 自动重启配置
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 3000,
    // 启动延迟
    wait_ready: true
  }]
};
