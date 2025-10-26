// PM2进程管理配置
module.exports = {
  apps: [{
    name: 'dongqilai-crm',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/dongqilai',
    instances: 2,  // 使用2个实例实现负载均衡
    exec_mode: 'cluster',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // 自动重启配置
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // 日志
    error_file: '/var/log/pm2/dongqilai-error.log',
    out_file: '/var/log/pm2/dongqilai-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 优雅退出
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
