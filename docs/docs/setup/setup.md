---
icon: 'lucide/download'
---

# Install

## Requirements

* A [MariaDB server](https://mariadb.com/downloads/) with ideally version 10.11 or later
* [Docker](https://docs.docker.com/engine/install/)

## Sourcemod

The panel is designed primarily for use in [Sourcemod](https://www.sourcemod.net/) for all its features, although in future may be expanded to support more games.

There are 4 available plugins:

* **panel_core** - the core plugin, including:
    - live game status to the panel via the Live Socket feature
    - running commands from panel via the Live Socket feature
    - tracking players that join
* **panel_activitymonitor** - tracks all in-game actions (chat, actions/commands, states (death, incaps), join/leaves) 
* **panel_notes** - admins can add notes for players and see them when the player joins
* **panel_bans** - shared bans across multiple servers

The panel_activitymonitor, panel_notes and panel_bans plugins are not _required_, but without them, they are main panel features. 
In addition, the database tables they use are required even if kept empty.

## Docker

There are two parts of the panel, the `admin-panel-server` and the `admin-panel-ui`. The UI handles serving the frontend/server-side rendering, while the server handles the rest.
They are intentionally kept separate to allow the frontend to still be usable even if the backend is down.

### Compose

```yaml
services:
  server:
    image: git.jackz.me/jackz/admin-panel-server:latest
    restart: always
    env_file: .env
    volumes:
      - ./config:/app/server/config:r
      - ./data:/app/server/data
      # Allow managing docker instances, needed for dynamic server support
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 8080:8080
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  ui:
    image: git.jackz.me/jackz/admin-panel-ui:latest
    restart: always
    environment:
      # Must match the name of the server's service
      NUXT_API_INTERNAL_URL: http://server:8080
      # Change this to your public URL, without /api path, just the domain
      NUXT_PUBLIC_API_AUTH_URL: https://demo.srcpanel.app
      SENTRY_DSN: ${SENTRY_DSN_UI}
    ports:
      - 3000:3000
```
#### Env

```env
##-------------##
## Web         ##
##-------------##
# Random secret for sessions
SESSION_SECRET=
# Random secret for oauth state. Can be same as session
STATE_SECRET=
# comma separated list of cors hosts
CORS_WHITELIST=
LISTEN_HOST=0.0.0.0
LISTEN_PORT=8080
##-------------##
## Database    ##
##-------------##
MYSQL_HOST=localhost
MYSQL_USER=panel
MYSQL_DB=panel
MYSQL_PASSWORD=

##-------------##
## Fluxer Bot  ##
##-------------##
# API Token for bot
FLUXER_API_TOKEN=
# ID of category to sync voice channels to panel servers
FLUXER_VOICELINK_CATEGORY_ID=

##-------------##
## Live Plugin ##
##-------------##
LIVE_PLUGIN_HOSTNAME=0.0.0.0
LIVE_PLUGIN_PORT=7878
#LIVE_PLUGIN_DEBUG=1

##---------------##
## Server Docker ##
##---------------##
DOCKER_ENABLE=1 # requires docker socket mounted
#DOCKER_FORCE_PROTOCOL= #http/https/ssh
#DOCKER_HOST=
#DOCKER_PORT=
#DOCKER_VERSION=
# If read only, panel will not auto start/stop instances, simply show them
#DOCKER_SERVER_READ_ONLY=

##---------------##
## Monitoring    ##
##---------------##
INFLUX_URL=http://monitoring.local:8429/
INFLUX_ID=custom_id
# If using influxdb and not victoria metrics:
INFLUX_TOKEN=
INFLUX_ORG=influxdb
INFLUX_BUCKET=panel

##---------------##
## SENTRY        ##
##---------------##
#SENTRY_DSN_SERVER=
#SENTRY_DSN_UI=
#SENTRY_ENV=custom_env

#-------------
# Misc
#-------------
# Needed for steam login, https://steamcommunity.com/dev/apikey
STEAM_WEB_APIKEY=
LOG_LEVEL=info
```

### Nginx

Example config used in the demo. If server or UI is offline, a basic fallback is shown. 


```nginx
upstream panel-api-demo {
    server 10.30.1.6:8083;
}
upstream panel-ui-demo {
    server 10.30.1.6:3002;
}
server {
    server_name demo.srcpanel.app;
    include snippets/SSL.conf;

    location / {
        client_max_body_size 1G;
        proxy_http_version 1.1;
        proxy_pass http://panel-ui-demo;
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        error_page 502 = @gateway_down;
    }
    location /api {
        client_max_body_size 1G;
        proxy_http_version 1.1;
        proxy_pass http://panel-api-demo;
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        error_page 502 = @gateway_down_api;
    }

    location @gateway_down_api {
        internal;
        default_type application/json;
        return 502 '{"error": "GATEWAY_ERROR", "message": "Cannot connect to admin panel server. Please try again later"}';
    }
    location @gateway_down {
        internal;
        return 502 '<h1>Admin panel is currently offline. Please try again later</h1>';
    }
}
```