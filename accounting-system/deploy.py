import paramiko
import os
import zipfile

print("Zipping project...")
zipf = zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk('.'):
    if '__pycache__' in root or '.git' in root or '.gemini' in root:
        continue
    for file in files:
        if file == 'deploy.zip' or file.endswith('.pyc'):
            continue
        filepath = os.path.join(root, file)
        arcname = os.path.relpath(filepath, '.')
        zipf.write(filepath, arcname)
zipf.close()

print("Connecting to VPS (118.27.147.203)...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('118.27.147.203', username='root', password='rpo9N120908/')

print("Uploading deploy.zip to VPS...")
sftp = ssh.open_sftp()
sftp.put('deploy.zip', '/root/deploy.zip')
sftp.close()

commands = [
    "apt-get update",
    "apt-get install -y python3 python3-pip unzip curl",
    "rm -rf /root/accounting-system",
    "unzip -q -o /root/deploy.zip -d /root/accounting-system",
    "chmod +x /root/accounting-system/server.py",
    # Create systemd service
    """cat << 'EOF' > /etc/systemd/system/simacc.service
[Unit]
Description=Simacc Accounting Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/accounting-system
ExecStart=/usr/bin/python3 server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF""",
    "systemctl daemon-reload",
    "systemctl enable simacc",
    "systemctl restart simacc",
    "curl -L --output /root/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb",
    "dpkg -i /root/cloudflared.deb"
]

print("Running setup commands on VPS...")
for cmd in commands:
    print(f"Running: {cmd[:40]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print(f"Warning: Command exited with status {exit_status}")
        print(stderr.read().decode())

ssh.close()
print("Deployment to VPS completed successfully!")
