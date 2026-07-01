import paramiko

print("Connecting to VPS (118.27.147.203)...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('118.27.147.203', username='root', password='rpo9N120908/')

commands = [
    "curl -fsSL https://get.docker.com -o get-docker.sh",
    "sh get-docker.sh",
    "mkdir -p /root/n8n/n8n_data",
    "chown -R 1000:1000 /root/n8n/n8n_data", # n8n node user
    """cat << 'EOF' > /root/n8n/docker-compose.yml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.simacc.online
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.simacc.online/
      - GENERIC_TIMEZONE=Asia/Bangkok
    volumes:
      - /root/n8n/n8n_data:/home/node/.n8n
EOF""",
    "cd /root/n8n && docker compose up -d"
]

print("Running n8n setup commands on VPS...")
for cmd in commands:
    print(f"Running: {cmd[:40]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print(f"Warning: Command exited with status {exit_status}")
        print(stderr.read().decode())
    else:
        print(stdout.read().decode()[:200] + "...")

ssh.close()
print("n8n Installation completed successfully!")
