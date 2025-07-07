#!/bin/bash
SERVER=$1
ENV=$2
if [[ -z "$SERVER" ]]; then
    echo "Usage: ./build.sh <ssh host>"
    exit 1
fi
if [[ -z "$ENV" ]]; then
    ENV=production
fi
declare -A -r ENV_FOLDER_MAP=(
  ["production"]="admin.jackz.me"
  ["staging"]="admin.jackz.me-staging"
)
DEPLOY_FOLDER=${ENV_FOLDER_MAP[$ENV]}
yarn build && \
    scp -r dist $SERVER:/var/www/admin.jackz.me.tmp/ && \
    ssh $SERVER -C "rm -rf /var/www/$DEPLOY_FOLDER.old && mv -T /var/www/$DEPLOY_FOLDER /var/www/$DEPLOY_FOLDER.old; mv -T /var/www/admin.jackz.me.tmp /var/www/$DEPLOY_FOLDER" && \
    echo Successfully deployed to env=$ENV folder=$DEPLOY_FOLDER