import paramiko
import os
import time

print("Connecting to VPS (118.27.147.203)...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('118.27.147.203', username='root', password='rpo9N120908/')

commands = [
    "while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do echo 'Waiting for dpkg lock...'; sleep 2; done",
    "apt-get install -y python3 python3-pip unzip curl",
    "dpkg -i /root/cloudflared.deb",
]

print("Running setup commands on VPS...")
for cmd in commands:
    print(f"Running: {cmd[:40]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print(f"Warning: Command exited with status {exit_status}")
        print(stderr.read().decode())
    else:
        print(stdout.read().decode())

ssh.close()
print("Deployment fix completed successfully!")
