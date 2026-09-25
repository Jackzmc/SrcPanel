#!/bin/bash
set -e

docker build -t git.jackz.me/jackz/srcpanel-server:latest --target final-server . "$@"
docker build -t git.jackz.me/jackz/srcpanel-ui:latest --target final-ui . "$@"