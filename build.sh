#!/bin/bash
set -e

docker build -t git.jackz.me/jackz/admin-panel-server:latest --target final-server . "$@"
docker build -t git.jackz.me/jackz/admin-panel-ui:latest --target final-ui . "$@"