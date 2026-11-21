#!/bin/sh
# On the VPS: pull the latest main and rebuild the container. Usage: ~/collabothon26/deploy.sh
set -e
cd "$(dirname "$0")"
git pull --ff-only
sudo docker compose up -d --build
sudo docker image prune -f
