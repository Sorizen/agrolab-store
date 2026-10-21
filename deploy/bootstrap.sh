#!/bin/bash
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SWAP_SIZE="${SWAP_SIZE:-2G}"
APP_DIR=/srv/agrolab

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash bootstrap.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

if [ -f /root/.ssh/authorized_keys ]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  if [ ! -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]; then
    install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  fi
fi

if [ ! -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]; then
  echo "No SSH key for $DEPLOY_USER: SSH hardening skipped so you are not locked out."
  HARDEN=0
else
  HARDEN=1
fi

if [ "$HARDEN" = 1 ]; then
  cat > /etc/ssh/sshd_config.d/10-agrolab.conf <<SSH
PermitRootLogin no
PasswordAuthentication no
SSH
  systemctl reload ssh
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if ! swapon --show | grep -q /swapfile; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

cat > /etc/apt/apt.conf.d/20auto-upgrades <<APT
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

systemctl enable --now fail2ban

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
touch /var/log/agrolab-sync.log
chown "$DEPLOY_USER":"$DEPLOY_USER" /var/log/agrolab-sync.log

echo
echo "Done. Log in as: ssh $DEPLOY_USER@<server-ip>"
echo "Next: clone both repositories into $APP_DIR (docs/DEPLOY.md, step 3)."
